// hooks/useHealth.js
// Quản lý dữ liệu sức khỏe, hai bình nước, cân nặng, hoạt động và đồng bộ thời gian thực
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/shared/Toast.jsx';
import { estimateRecommendedWater } from '../services/healthPersonalization.js';

// Format YYYY-MM-DD theo giờ địa phương (Việt Nam)
export function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useHealth() {
  const { user, partner, couple } = useAuth();
  const todayStr = useMemo(() => getTodayDateStr(), []);

  // 1. Hồ sơ sức khỏe (của tôi & của người yêu) - Khởi tạo tức thì từ LocalStorage
  const [myProfile, setMyProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_health_profile_${user?.id}`) || 'null');
    } catch {
      return null;
    }
  });
  const [partnerProfile, setPartnerProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_health_profile_${partner?.id}`) || 'null');
    } catch {
      return null;
    }
  });

  // 2. Nhật ký nước uống hôm nay
  const [myWaterLogs, setMyWaterLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_water_${user?.id}_${todayStr}`) || '[]');
    } catch {
      return [];
    }
  });
  const [partnerWaterLogs, setPartnerWaterLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_water_${partner?.id}_${todayStr}`) || '[]');
    } catch {
      return [];
    }
  });

  // 3. Lịch sử nước uống 7 ngày gần nhất
  const [weeklyWaterHistory, setWeeklyWaterHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_water_history_${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });

  // 4. Lịch sử cân nặng
  const [weightLogs, setWeightLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_weights_${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });
  const [partnerWeightLogs, setPartnerWeightLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_weights_${partner?.id}`) || '[]');
    } catch {
      return [];
    }
  });

  // 5. Hoạt động thể chất & Smartwatch
  const [myActivity, setMyActivity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_activity_${user?.id}_${todayStr}`) || 'null');
    } catch {
      return null;
    }
  });
  const [partnerActivity, setPartnerActivity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_activity_${partner?.id}_${todayStr}`) || 'null');
    } catch {
      return null;
    }
  });

  // 6. Lời động viên & Nudge từ người yêu
  const [incomingCheers, setIncomingCheers] = useState([]);

  // Không bao giờ chặn màn hình nếu đã có dữ liệu cache từ trước
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(`sc_health_profile_${user?.id}`);
      return !cached;
    } catch {
      return true;
    }
  });

  const [hasCelebratedGoal, setHasCelebratedGoal] = useState(() => {
    return localStorage.getItem(`sc_water_celebrated_${todayStr}`) === 'true';
  });

  // Helper tính tổng nước trong ngày
  const myTodayWater = useMemo(() => {
    return myWaterLogs.reduce((sum, log) => sum + (parseInt(log.amount, 10) || 0), 0);
  }, [myWaterLogs]);

  const partnerTodayWater = useMemo(() => {
    return partnerWaterLogs.reduce((sum, log) => sum + (parseInt(log.amount, 10) || 0), 0);
  }, [partnerWaterLogs]);

  // Lượng nước mục tiêu: Ưu tiên daily_water_goal đã lưu, nếu chưa có thì tự động tính từ Cân nặng (BMI) & Mức độ vận động
  const myWaterGoal = useMemo(() => {
    if (myProfile?.daily_water_goal) return myProfile.daily_water_goal;
    if (myProfile?.current_weight) {
      return estimateRecommendedWater(
        parseFloat(myProfile.current_weight),
        myProfile.activity_level || 'moderate',
        myActivity?.steps || 0,
        myActivity?.calories_burned || 0
      );
    }
    return 2000;
  }, [myProfile?.daily_water_goal, myProfile?.current_weight, myProfile?.activity_level, myActivity?.steps, myActivity?.calories_burned]);

  const partnerWaterGoal = useMemo(() => {
    if (partnerProfile?.daily_water_goal) return partnerProfile.daily_water_goal;
    if (partnerProfile?.current_weight) {
      return estimateRecommendedWater(
        parseFloat(partnerProfile.current_weight),
        partnerProfile.activity_level || 'moderate',
        partnerActivity?.steps || 0,
        partnerActivity?.calories_burned || 0
      );
    }
    return 2000;
  }, [partnerProfile?.daily_water_goal, partnerProfile?.current_weight, partnerProfile?.activity_level, partnerActivity?.steps, partnerActivity?.calories_burned]);

  const myProgressPercent = Math.min(100, Math.round((myTodayWater / myWaterGoal) * 100));
  const partnerProgressPercent = Math.min(100, Math.round((partnerTodayWater / partnerWaterGoal) * 100));

  // Fallback đọc LocalStorage khi offline hoặc quá thời gian chờ
  const loadLocalHealthData = useCallback(() => {
    try {
      const cachedMyLogs = JSON.parse(localStorage.getItem(`sc_water_${user?.id}_${todayStr}`) || '[]');
      setMyWaterLogs(cachedMyLogs);

      if (partner?.id) {
        const cachedPartnerLogs = JSON.parse(localStorage.getItem(`sc_water_${partner.id}_${todayStr}`) || '[]');
        setPartnerWaterLogs(cachedPartnerLogs);
      }

      const cachedProfile = JSON.parse(localStorage.getItem(`sc_health_profile_${user?.id}`) || 'null');
      if (cachedProfile) setMyProfile(cachedProfile);

      const cachedWeights = JSON.parse(localStorage.getItem(`sc_weights_${user?.id}`) || '[]');
      setWeightLogs(cachedWeights);

      const cachedAct = JSON.parse(localStorage.getItem(`sc_activity_${user?.id}_${todayStr}`) || 'null');
      if (cachedAct) setMyActivity(cachedAct);
    } catch (e) {
      console.warn('Lỗi đọc local health data:', e);
    }
  }, [user?.id, partner?.id, todayStr]);

  // Tải dữ liệu ban đầu song song (Parallel Promise.allSettled) với Timeout 3.5s an toàn
  const fetchHealthData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    if (!isSupabaseReady) {
      loadLocalHealthData();
      setIsLoading(false);
      return;
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

      // Giới hạn thời gian chờ tối đa 3.5s để không bao giờ treo app
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 3500));

      const batchPromise = Promise.allSettled([
        // 0: my profile
        supabase.from('health_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        // 1: partner profile
        partner?.id ? supabase.from('health_profiles').select('*').eq('user_id', partner.id).maybeSingle() : Promise.resolve({ data: null }),
        // 2: my water logs today
        supabase.from('water_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr).order('log_time', { ascending: false }),
        // 3: partner water logs today
        partner?.id ? supabase.from('water_logs').select('*').eq('user_id', partner.id).eq('log_date', todayStr).order('log_time', { ascending: false }) : Promise.resolve({ data: null }),
        // 4: weekly water history
        supabase.from('water_logs').select('*').eq('user_id', user.id).gte('log_date', sevenDaysStr).order('log_date', { ascending: true }),
        // 5: my weight logs
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
        // 6: partner weight logs
        partner?.id ? supabase.from('weight_logs').select('*').eq('user_id', partner.id).order('log_date', { ascending: false }).limit(30) : Promise.resolve({ data: null }),
        // 7: my activity
        supabase.from('activity_logs').select('*').eq('user_id', user.id).eq('activity_date', todayStr).maybeSingle(),
        // 8: partner activity
        partner?.id ? supabase.from('activity_logs').select('*').eq('user_id', partner.id).eq('activity_date', todayStr).maybeSingle() : Promise.resolve({ data: null }),
        // 9: cheers
        supabase.from('couple_cheers').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      const raceResult = await Promise.race([batchPromise, timeoutPromise]);

      if (raceResult === 'TIMEOUT') {
        console.warn('Health batch fetch exceeded 3.5s timeout, using local cache');
        loadLocalHealthData();
        return;
      }

      const results = raceResult;

      // 0: My Profile
      if (results[0].status === 'fulfilled' && results[0].value?.data) {
        setMyProfile(results[0].value.data);
        try { localStorage.setItem(`sc_health_profile_${user.id}`, JSON.stringify(results[0].value.data)); } catch {}
      } else if (results[0].status === 'fulfilled' && !results[0].value?.error) {
        // Init default profile in background
        const defaultProf = {
          user_id: user.id,
          daily_water_goal: 2000,
          share_water: true,
          share_activity: true,
          activity_level: 'moderate',
          health_goal: 'maintain'
        };
        setMyProfile(defaultProf);
        supabase.from('health_profiles').insert([defaultProf]).select().maybeSingle().then(({ data }) => {
          if (data) {
            setMyProfile(data);
            try { localStorage.setItem(`sc_health_profile_${user.id}`, JSON.stringify(data)); } catch {}
          }
        }).catch(() => {});
      }

      // 1: Partner Profile
      if (results[1].status === 'fulfilled' && results[1].value?.data) {
        setPartnerProfile(results[1].value.data);
        try { localStorage.setItem(`sc_health_profile_${partner.id}`, JSON.stringify(results[1].value.data)); } catch {}
      }

      // 2: My Water Logs Today
      if (results[2].status === 'fulfilled' && results[2].value?.data) {
        setMyWaterLogs(results[2].value.data);
        try { localStorage.setItem(`sc_water_${user.id}_${todayStr}`, JSON.stringify(results[2].value.data)); } catch {}
      }

      // 3: Partner Water Logs Today
      if (results[3].status === 'fulfilled' && results[3].value?.data) {
        setPartnerWaterLogs(results[3].value.data);
        try { localStorage.setItem(`sc_water_${partner.id}_${todayStr}`, JSON.stringify(results[3].value.data)); } catch {}
      }

      // 4: Weekly Water History
      if (results[4].status === 'fulfilled' && results[4].value?.data) {
        setWeeklyWaterHistory(results[4].value.data);
        try { localStorage.setItem(`sc_water_history_${user.id}`, JSON.stringify(results[4].value.data)); } catch {}
      }

      // 5: My Weight Logs
      if (results[5].status === 'fulfilled' && results[5].value?.data) {
        setWeightLogs(results[5].value.data);
        try { localStorage.setItem(`sc_weights_${user.id}`, JSON.stringify(results[5].value.data)); } catch {}
      }

      // 6: Partner Weight Logs
      if (results[6].status === 'fulfilled' && results[6].value?.data) {
        setPartnerWeightLogs(results[6].value.data);
        try { localStorage.setItem(`sc_weights_${partner.id}`, JSON.stringify(results[6].value.data)); } catch {}
      }

      // 7: My Activity Today
      if (results[7].status === 'fulfilled' && results[7].value?.data) {
        setMyActivity(results[7].value.data);
        try { localStorage.setItem(`sc_activity_${user.id}_${todayStr}`, JSON.stringify(results[7].value.data)); } catch {}
      }

      // 8: Partner Activity Today
      if (results[8].status === 'fulfilled' && results[8].value?.data) {
        setPartnerActivity(results[8].value.data);
        try { localStorage.setItem(`sc_activity_${partner.id}_${todayStr}`, JSON.stringify(results[8].value.data)); } catch {}
      }

      // 9: Cheers
      if (results[9].status === 'fulfilled' && results[9].value?.data) {
        setIncomingCheers(results[9].value.data);
      }
    } catch (err) {
      console.warn('Lỗi fetchHealthData, sử dụng cache:', err);
      loadLocalHealthData();
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, partner?.id, todayStr, loadLocalHealthData]);

  // Chạy khi mount hoặc đổi user/partner
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Lắng nghe Realtime Supabase cho các bảng sức khỏe
  useEffect(() => {
    if (!isSupabaseReady || !user?.id) return;

    const channel = supabase.channel(`health-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs' }, (payload) => {
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchHealthData();
        } else if (partner?.id && (payload.new?.user_id === partner.id || payload.old?.user_id === partner.id)) {
          fetchHealthData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_profiles' }, () => {
        fetchHealthData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_logs' }, () => {
        fetchHealthData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        fetchHealthData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couple_cheers', filter: `receiver_id=eq.${user.id}` }, (payload) => {
        showToast(payload.new.message || '💌 Người ấy vừa gửi lời động viên sức khỏe cho bạn!', 'success');
        fetchHealthData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, partner?.id, fetchHealthData]);

  // Thêm lượng nước uống
  const logWater = async (amount, note = '') => {
    if (!user?.id || !amount || amount <= 0) return;

    const newLog = {
      id: 'local-' + Date.now(),
      user_id: user.id,
      amount: parseInt(amount, 10),
      log_date: todayStr,
      log_time: new Date().toISOString(),
      note: note || null,
      created_at: new Date().toISOString()
    };

    // Cập nhật Optimistic
    const updatedLogs = [newLog, ...myWaterLogs];
    setMyWaterLogs(updatedLogs);
    localStorage.setItem(`sc_water_${user.id}_${todayStr}`, JSON.stringify(updatedLogs));

    const updatedTotal = updatedLogs.reduce((sum, l) => sum + l.amount, 0);

    // Kích hoạt hiệu ứng chúc mừng khi lần đầu đạt mục tiêu
    if (updatedTotal >= myWaterGoal && !hasCelebratedGoal) {
      setHasCelebratedGoal(true);
      localStorage.setItem(`sc_water_celebrated_${todayStr}`, 'true');
      window.dispatchEvent(new CustomEvent('show-celebration'));
      showToast(`🎉 Xuất sắc! Bạn đã hoàn thành mục tiêu uống ${myWaterGoal}ml nước hôm nay! 💙`, 'success');

      // Tự động gửi thông báo chúc mừng tới đối phương nếu có ghép đôi
      if (partner?.id && couple?.id && isSupabaseReady) {
        try {
          const autoCongrats = {
            id: 'auto-congrats-' + Date.now(),
            couple_id: couple.id,
            sender_id: user.id,
            sender_name: user.display_name || user.full_name || 'Người ấy',
            receiver_id: partner.id,
            cheer_type: 'congrats',
            message: `${user.display_name || user.full_name || 'Người ấy'} vừa xuất sắc uống đủ ${myWaterGoal}ml nước hôm nay rồi nè! 💧🎉`,
            created_at: new Date().toISOString()
          };

          supabase.channel(`couple_notifications_${couple.id}`).send({
            type: 'broadcast',
            event: 'new_cheer',
            payload: autoCongrats
          }).catch(err => console.warn('Broadcast congrats error:', err));

          await supabase.from('couple_cheers').insert([{
            couple_id: couple.id,
            sender_id: user.id,
            receiver_id: partner.id,
            cheer_type: 'congrats',
            message: autoCongrats.message
          }]);
        } catch (e) {
          console.warn('Không gửi được cheer:', e);
        }
      }
    } else {
      showToast(`+${amount}ml nước đã được ghi nhận! 💧`, 'success');
    }

    // Lưu vào Supabase
    if (isSupabaseReady) {
      try {
        const { data, error } = await supabase.from('water_logs').insert([{
          user_id: user.id,
          amount: parseInt(amount, 10),
          log_date: todayStr,
          note: note || null
        }]).select().single();

        if (data && !error) {
          // Cập nhật id thật từ DB
          setMyWaterLogs(prev => prev.map(l => l.id === newLog.id ? data : l));
        }
      } catch (err) {
        console.warn('Lỗi ghi water_logs lên Supabase, giữ local:', err);
      }
    }
  };

  // Xóa một lần uống
  const deleteWaterLog = async (logId) => {
    const updated = myWaterLogs.filter(l => l.id !== logId);
    setMyWaterLogs(updated);
    localStorage.setItem(`sc_water_${user?.id}_${todayStr}`, JSON.stringify(updated));
    showToast('Đã xóa bản ghi uống nước', 'info');

    if (isSupabaseReady && !String(logId).startsWith('local-')) {
      try {
        await supabase.from('water_logs').delete().eq('id', logId);
      } catch (e) {
        console.warn('Lỗi xóa log:', e);
      }
    }
  };

  // Cập nhật một lần uống
  const updateWaterLog = async (logId, newAmount) => {
    const amountNum = parseInt(newAmount, 10);
    if (!amountNum || amountNum <= 0) return;

    const updated = myWaterLogs.map(l => l.id === logId ? { ...l, amount: amountNum } : l);
    setMyWaterLogs(updated);
    localStorage.setItem(`sc_water_${user?.id}_${todayStr}`, JSON.stringify(updated));
    showToast('Đã cập nhật lượng nước', 'success');

    if (isSupabaseReady && !String(logId).startsWith('local-')) {
      try {
        await supabase.from('water_logs').update({ amount: amountNum }).eq('id', logId);
      } catch (e) {
        console.warn('Lỗi cập nhật log:', e);
      }
    }
  };

  // Cập nhật hồ sơ sức khỏe (tự động đồng bộ mục tiêu nước nếu có cập nhật cân nặng)
  const updateProfile = async (fields, silent = false) => {
    if (!user?.id) return;

    // Tự động đồng bộ mục tiêu nước nếu có cập nhật cân nặng mà chưa truyền daily_water_goal cụ thể
    const newWeight = fields.current_weight !== undefined ? parseFloat(fields.current_weight) : parseFloat(myProfile?.current_weight);
    const activityLvl = fields.activity_level || myProfile?.activity_level || 'moderate';
    
    let computedWaterGoal = fields.daily_water_goal;
    if (!computedWaterGoal && newWeight && newWeight > 0) {
      computedWaterGoal = estimateRecommendedWater(
        newWeight,
        activityLvl,
        myActivity?.steps || 0,
        myActivity?.calories_burned || 0
      );
    }

    const updated = { 
      ...(myProfile || {}), 
      ...fields, 
      ...(computedWaterGoal ? { daily_water_goal: computedWaterGoal } : {}),
      user_id: user.id 
    };

    setMyProfile(updated);
    localStorage.setItem(`sc_health_profile_${user.id}`, JSON.stringify(updated));
    if (!silent) {
      showToast('Đã lưu thông tin sức khỏe cá nhân', 'success');
    }

    if (isSupabaseReady) {
      try {
        const { error } = await supabase.from('health_profiles').upsert(updated);
        if (error) console.warn('Lỗi upsert health_profiles:', error);
      } catch (e) {
        console.warn('Lỗi lưu profile Supabase:', e);
      }
    }
  };

  // Ghi nhận cân nặng mới (tự động tính lại BMI & mục tiêu nước chuẩn 35ml/kg)
  const logWeight = async (weight, note = '') => {
    const weightNum = parseFloat(weight);
    if (!user?.id || !weightNum || weightNum <= 0) return;

    const newWeightLog = {
      id: 'local-' + Date.now(),
      user_id: user.id,
      weight: weightNum,
      log_date: todayStr,
      note: note || null,
      created_at: new Date().toISOString()
    };

    const updatedLogs = [newWeightLog, ...weightLogs];
    setWeightLogs(updatedLogs);
    localStorage.setItem(`sc_weights_${user.id}`, JSON.stringify(updatedLogs));

    // Tính lại mục tiêu nước theo cân nặng mới
    const newWaterGoal = estimateRecommendedWater(
      weightNum,
      myProfile?.activity_level || 'moderate',
      myActivity?.steps || 0,
      myActivity?.calories_burned || 0
    );

    // Cập nhật cân nặng hiện tại và mục tiêu nước trong profile
    updateProfile({ 
      current_weight: weightNum, 
      weight_date: todayStr,
      daily_water_goal: newWaterGoal
    }, true);

    showToast(`Đã lưu cân nặng: ${weightNum} kg. Mục tiêu nước: ${newWaterGoal.toLocaleString()} ml 💧`, 'success');

    if (isSupabaseReady) {
      try {
        await supabase.from('weight_logs').insert([{
          user_id: user.id,
          weight: weightNum,
          log_date: todayStr,
          note: note || null
        }]);
      } catch (e) {
        console.warn('Lỗi ghi weight_logs:', e);
      }
    }
  };

  // Ghi nhận hoạt động thể chất (Smartwatch, Đồng bộ tự động hoặc Nhập tay)
  const logActivity = async ({ steps = 0, activeMinutes = 0, caloriesBurned = 0, heartRateAvg = null, sleepMinutes = null, source = 'manual', notify = false }) => {
    if (!user?.id) return;

    const activityPayload = {
      user_id: user.id,
      activity_date: todayStr,
      steps: parseInt(steps, 10) || 0,
      active_minutes: parseInt(activeMinutes, 10) || 0,
      calories_burned: parseInt(caloriesBurned, 10) || 0,
      heart_rate_avg: heartRateAvg ? parseInt(heartRateAvg, 10) : null,
      sleep_minutes: sleepMinutes ? parseInt(sleepMinutes, 10) : null,
      source: source || 'manual',
      synced_at: new Date().toISOString()
    };

    setMyActivity(activityPayload);
    localStorage.setItem(`sc_activity_${user.id}_${todayStr}`, JSON.stringify(activityPayload));
    
    if (notify) {
      showToast(`Đã đồng bộ hoạt động từ [${source}]`, 'success');
    }

    if (isSupabaseReady) {
      try {
        await supabase.from('activity_logs').upsert(activityPayload, { onConflict: 'user_id,activity_date,source' });
      } catch (e) {
        console.warn('Lỗi ghi activity_logs:', e);
      }
    }
  };

  // Gửi lời động viên / Nudge tới người yêu
  const sendCheer = async (cheerType = 'drink_water', customMessage = '') => {
    if (!user?.id || !partner?.id || !couple?.id) {
      showToast('Cần kết nối với người yêu để gửi tương tác nhé!', 'error');
      return;
    }

    let defaultMsg = 'Uống một ngụm nước nhé người yêu ơi! 💧💕';
    if (cheerType === 'congrats') defaultMsg = 'Chúc mừng BABI đã hoàn thành mục tiêu sức khỏe hôm nay! 🎉';
    if (cheerType === 'hug') defaultMsg = 'Gửi BABI một cái ôm ấm áp và tràn đầy năng lượng! 🧸✨';
    if (cheerType === 'workout') defaultMsg = 'Cùng đứng dậy vươn vai và vận động chút nào! 🏃‍♂️';

    const msg = customMessage || defaultMsg;
    showToast(`Đã gửi lời nhắn yêu thương tới ${partner.display_name || partner.full_name}!`, 'success');

    if (isSupabaseReady) {
      const cheerPayload = {
        id: 'cheer-' + Date.now(),
        couple_id: couple.id,
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || 'Người yêu',
        receiver_id: partner.id,
        cheer_type: cheerType,
        message: msg,
        created_at: new Date().toISOString()
      };

      try {
        // Broadcast qua WebSocket realtime tức thời (độ trễ ~20ms)
        supabase.channel(`couple_notifications_${couple.id}`).send({
          type: 'broadcast',
          event: 'new_cheer',
          payload: cheerPayload
        }).catch(err => console.warn('Broadcast cheer error:', err));

        // Lưu vào DB để lưu vết và đồng bộ
        await supabase.from('couple_cheers').insert([{
          couple_id: couple.id,
          sender_id: user.id,
          receiver_id: partner.id,
          cheer_type: cheerType,
          message: msg
        }]);
      } catch (e) {
        console.warn('Lỗi sendCheer:', e);
      }
    }
  };

  // Đánh dấu đã đọc lời động viên
  const markCheerRead = async (cheerId) => {
    setIncomingCheers(prev => prev.filter(c => c.id !== cheerId));
    if (isSupabaseReady && !String(cheerId).startsWith('local-')) {
      try {
        await supabase.from('couple_cheers').update({ is_read: true }).eq('id', cheerId);
      } catch (e) {
        console.warn('Lỗi markCheerRead:', e);
      }
    }
  };

  return {
    todayStr,
    isLoading,
    myProfile,
    partnerProfile,
    myWaterLogs,
    partnerWaterLogs,
    myTodayWater,
    partnerTodayWater,
    myWaterGoal,
    partnerWaterGoal,
    myProgressPercent,
    partnerProgressPercent,
    weeklyWaterHistory,
    weightLogs,
    partnerWeightLogs,
    myActivity,
    partnerActivity,
    incomingCheers,
    actions: {
      logWater,
      deleteWaterLog,
      updateWaterLog,
      updateProfile,
      logWeight,
      logActivity,
      sendCheer,
      markCheerRead,
      refresh: fetchHealthData
    }
  };
}
