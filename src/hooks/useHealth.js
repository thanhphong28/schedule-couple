// hooks/useHealth.js
// Quản lý dữ liệu sức khỏe, hai bình nước, cân nặng, hoạt động và đồng bộ thời gian thực
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/shared/Toast.jsx';

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

  // 1. Hồ sơ sức khỏe (của tôi & của người yêu)
  const [myProfile, setMyProfile] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);

  // 2. Nhật ký nước uống hôm nay
  const [myWaterLogs, setMyWaterLogs] = useState([]);
  const [partnerWaterLogs, setPartnerWaterLogs] = useState([]);

  // 3. Lịch sử nước uống 7 ngày gần nhất
  const [weeklyWaterHistory, setWeeklyWaterHistory] = useState([]);

  // 4. Lịch sử cân nặng
  const [weightLogs, setWeightLogs] = useState([]);
  const [partnerWeightLogs, setPartnerWeightLogs] = useState([]);

  // 5. Hoạt động thể chất & Smartwatch
  const [myActivity, setMyActivity] = useState(null);
  const [partnerActivity, setPartnerActivity] = useState(null);

  // 6. Lời động viên & Nudge từ người yêu
  const [incomingCheers, setIncomingCheers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
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

  const myWaterGoal = myProfile?.daily_water_goal || 2000;
  const partnerWaterGoal = partnerProfile?.daily_water_goal || 2000;

  const myProgressPercent = Math.min(100, Math.round((myTodayWater / myWaterGoal) * 100));
  const partnerProgressPercent = Math.min(100, Math.round((partnerTodayWater / partnerWaterGoal) * 100));

  // Tải dữ liệu ban đầu
  const fetchHealthData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Tải Profile của tôi
      if (isSupabaseReady) {
        const { data: myProf, error: myProfErr } = await supabase
          .from('health_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (myProf) {
          setMyProfile(myProf);
        } else if (!myProfErr) {
          // Khởi tạo profile mặc định
          const newProfile = {
            user_id: user.id,
            daily_water_goal: 2000,
            share_water: true,
            share_activity: true,
            activity_level: 'moderate',
            health_goal: 'maintain'
          };
          const { data: created } = await supabase.from('health_profiles').insert([newProfile]).select().single();
          if (created) setMyProfile(created);
        }

        // 2. Tải Profile của người yêu (nếu có ghép đôi)
        if (partner?.id) {
          const { data: partProf } = await supabase
            .from('health_profiles')
            .select('*')
            .eq('user_id', partner.id)
            .maybeSingle();
          if (partProf) setPartnerProfile(partProf);
        }

        // 3. Tải Water Logs hôm nay của tôi
        try {
          const { data: myWLogs } = await supabase
            .from('water_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('log_date', todayStr)
            .order('log_time', { ascending: false });
          if (myWLogs) setMyWaterLogs(myWLogs);

          // 4. Tải Water Logs hôm nay của người yêu (nếu cho phép chia sẻ)
          if (partner?.id) {
            const { data: partWLogs } = await supabase
              .from('water_logs')
              .select('*')
              .eq('user_id', partner.id)
              .eq('log_date', todayStr)
              .order('log_time', { ascending: false });
            if (partWLogs) setPartnerWaterLogs(partWLogs);
          }

          // 5. Tải lịch sử 7 ngày gần nhất của tôi
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

          const { data: weekLogs } = await supabase
            .from('water_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('log_date', sevenDaysStr)
            .order('log_date', { ascending: true });
          if (weekLogs) setWeeklyWaterHistory(weekLogs);

          // 6. Tải Lịch sử cân nặng
          const { data: wLogs } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('log_date', { ascending: false })
            .limit(30);
          if (wLogs) setWeightLogs(wLogs);

          if (partner?.id) {
            const { data: partWLogs } = await supabase
              .from('weight_logs')
              .select('*')
              .eq('user_id', partner.id)
              .order('log_date', { ascending: false })
              .limit(30);
            if (partWLogs) setPartnerWeightLogs(partWLogs);
          }

          // 7. Tải hoạt động hôm nay
          const { data: actLogs } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('activity_date', todayStr)
            .maybeSingle();
          if (actLogs) setMyActivity(actLogs);

          if (partner?.id) {
            const { data: partAct } = await supabase
              .from('activity_logs')
              .select('*')
              .eq('user_id', partner.id)
              .eq('activity_date', todayStr)
              .maybeSingle();
            if (partAct) setPartnerActivity(partAct);
          }

          // 8. Tải lời động viên chưa đọc
          const { data: cheers } = await supabase
            .from('couple_cheers')
            .select('*, sender:sender_id(display_name, full_name, avatar_url)')
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (cheers) setIncomingCheers(cheers);

        } catch (tableErr) {
          // Bảng chưa có trong Supabase, dùng LocalStorage Fallback an toàn
          console.warn('Sử dụng LocalStorage fallback cho bảng sức khỏe mới:', tableErr);
          loadLocalHealthData();
        }
      } else {
        loadLocalHealthData();
      }
    } catch (err) {
      console.error('Lỗi fetchHealthData:', err);
      loadLocalHealthData();
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, partner?.id, todayStr]);

  // Fallback đọc LocalStorage khi chưa chạy migration hoặc offline
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

  // Cập nhật hồ sơ sức khỏe
  const updateProfile = async (fields, silent = false) => {
    if (!user?.id) return;
    const updated = { ...(myProfile || {}), ...fields, user_id: user.id };
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

  // Ghi nhận cân nặng mới
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

    // Cập nhật cân nặng hiện tại trong profile (im lặng, không bắn toast trùng)
    updateProfile({ current_weight: weightNum, weight_date: todayStr }, true);
    showToast(`Đã lưu cân nặng: ${weightNum} kg`, 'success');

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
      source: source || 'smartwatch',
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
