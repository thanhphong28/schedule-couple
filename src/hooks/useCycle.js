import { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { nanoid } from '../lib/utils.js';
import { MEDICAL_EVIDENCES } from '../data/medical_evidences.js';

// Calculate days between two dates
const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Add days to a date string (YYYY-MM-DD)
const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export function useCycle() {
  const { user, partner } = useAuth();
  const { showToast } = useApp();
  const [profile, setProfile] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // We need to fetch data for either the user (if female) or the partner (if user is male, fetch partner's data)
  // Assuming 'FEMALE' is the gender value. Let's find the female user ID.
  const isFemale = user?.gender === 'FEMALE' || user?.gender === 'Nữ' || user?.gender === 'female';
  const isMale = !isFemale;
  const femaleId = isFemale ? user?.id : partner?.id;

  useEffect(() => {
    if (!isSupabaseReady || !femaleId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Fetch Profile
        let { data: hp } = await supabase.from('health_profiles').select('*').eq('user_id', femaleId).single();
        if (!hp && isFemale) {
          // Auto create profile for female
          const { data: newHp } = await supabase.from('health_profiles').insert([{ user_id: femaleId }]).select().single();
          hp = newHp;
        }
        setProfile(hp);

        // 2. Fetch Cycles (last 6 to optimize)
        const { data: cyc } = await supabase.from('menstrual_cycles').select('*').eq('user_id', femaleId).order('start_date', { ascending: false }).limit(6);
        setCycles(cyc || []);

        // 3. Fetch Symptoms for the active cycle or last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: sym } = await supabase.from('symptoms_log')
          .select('*')
          .eq('user_id', femaleId)
          .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0]);
        setSymptoms(sym || []);

      } catch (err) {
        console.error('Error fetching cycle data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Real-time subscriptions
    const channel = supabase.channel('health-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menstrual_cycles', filter: `user_id=eq.${femaleId}` }, () => {
        supabase.from('menstrual_cycles').select('*').eq('user_id', femaleId).order('start_date', { ascending: false }).limit(6)
          .then(({ data }) => setCycles(data || []));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_profiles', filter: `user_id=eq.${femaleId}` }, () => {
        supabase.from('health_profiles').select('*').eq('user_id', femaleId).single()
          .then(({ data }) => setProfile(data));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'symptoms_log', filter: `user_id=eq.${femaleId}` }, (payload) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        supabase.from('symptoms_log').select('*').eq('user_id', femaleId).gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
          .then(({ data }) => setSymptoms(data || []));
          
        if (isMale) {
          // Gửi tín hiệu thông báo cho bạn nam
          import('../components/shared/Toast.jsx').then(m => m.showToast('Người yêu của bạn vừa ghi nhận cảm xúc/sức khỏe mới! ❤️', 'info'));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [femaleId, user, partner]);

  // ==========================================
  // ENGINE TÍNH TOÁN DỰ ĐOÁN (EVIDENCE-BASED)
  // ==========================================
  const getInsightForDate = (targetDateStr = new Date().toISOString().split('T')[0]) => {
    if (!profile) return null;

    // 1. Calculate Average Cycle Length
    let avgLength = profile.average_cycle_length || 28;
    let avgPeriod = profile.average_period_length || 5;
    
    // Chỉ lấy các chu kỳ có end_date để tính chính xác
    const completedCycles = cycles.filter(c => c.cycle_length != null);
    if (completedCycles.length > 0) {
      // Bỏ qua outliers nếu <21 hoặc >35
      const validCycles = completedCycles.filter(c => c.cycle_length >= 21 && c.cycle_length <= 35);
      const cyclesToUse = validCycles.length > 0 ? validCycles : completedCycles;
      
      const totalLen = cyclesToUse.reduce((acc, c) => acc + c.cycle_length, 0);
      avgLength = Math.round(totalLen / cyclesToUse.length);
    }

    // 2. Identify Current Cycle
    const currentCycle = cycles.length > 0 ? cycles[0] : null;
    
    let refDate = currentCycle ? currentCycle.start_date : new Date().toISOString().split('T')[0];
    let diffDays = getDaysDiff(refDate, targetDateStr);
    
    // Project into the correct cycle
    if (diffDays >= 0) {
      // Future or current
      const cyclesAhead = Math.floor(diffDays / avgLength);
      refDate = addDays(refDate, cyclesAhead * avgLength);
    } else {
      // Past
      const cyclesBehind = Math.ceil(Math.abs(diffDays) / avgLength);
      refDate = addDays(refDate, -(cyclesBehind * avgLength));
    }
    
    let cycleDay = getDaysDiff(refDate, targetDateStr) + 1;
    let nextPeriodStart = addDays(refDate, avgLength);
    let ovulationDate = addDays(nextPeriodStart, -14);
    let currentPhase = 'follicular';

    if (currentCycle) {
      if (cycleDay > 0 && cycleDay <= avgPeriod) {
        currentPhase = 'menstruation';
      } else if (targetDateStr >= addDays(ovulationDate, -2) && targetDateStr <= addDays(ovulationDate, 2)) {
        currentPhase = 'ovulation';
      } else if (targetDateStr > addDays(ovulationDate, 2)) {
        currentPhase = 'luteal';
      } else {
        currentPhase = 'follicular';
      }
    }

    // 3. Quyền riêng tư (Bắt buộc chia sẻ)
    const canViewPhase = true;
    const canViewSymptoms = true;

    return {
      avgLength,
      avgPeriod,
      currentCycle,
      cycleDay,
      nextPeriodStart,
      ovulationDate,
      currentPhase: canViewPhase ? currentPhase : 'hidden',
      evidence: canViewPhase ? MEDICAL_EVIDENCES.phases[currentPhase] : null,
      canViewSymptoms,
      symptomsToday: symptoms.filter(s => s.log_date === targetDateStr)
    };
  };

  // ==========================================
  // ACTIONS (MUTATIONS)
  // ==========================================
  const startNewPeriod = async (startDate, periodLength = null) => {
    if (!isFemale) return;
    
    try {
      // Tìm xem ngày này đã có trong chu kỳ nào chưa (để update)
      const existingCycle = cycles.find(c => c.start_date === startDate);
      
      if (existingCycle) {
        // Cập nhật chu kỳ có sẵn
        const updates = {};
        if (periodLength) updates.period_length = periodLength;
        await supabase.from('menstrual_cycles').update(updates).eq('id', existingCycle.id);
      } else {
        // Đóng chu kỳ cũ nhất đang active (nếu có)
        if (cycles.length > 0) {
          const activeCycle = cycles[0];
          // Nếu start_date truyền vào > activeCycle.start_date -> đây là kỳ kinh mới
          if (startDate > activeCycle.start_date) {
            const actualCycleLength = getDaysDiff(activeCycle.start_date, startDate);
            await supabase.from('menstrual_cycles').update({
              cycle_length: actualCycleLength,
              is_active: false
            }).eq('id', activeCycle.id);
          }
        }
        
        // Thêm chu kỳ mới
        await supabase.from('menstrual_cycles').insert([{
          user_id: user.id,
          start_date: startDate,
          period_length: periodLength || 5,
          is_active: true
        }]);
      }

      // Update Health Profile
      if (periodLength) {
        // Lấy trung bình cộng của period_length các chu kỳ hiện có (bao gồm cả cái vừa thêm/sửa)
        const { data: updatedCycles } = await supabase.from('menstrual_cycles').select('*').eq('user_id', user.id);
        const periods = (updatedCycles || []).filter(c => c.period_length);
        let newAvgPeriod = periodLength;
        if (periods.length > 0) {
          const totalP = periods.reduce((acc, c) => acc + c.period_length, 0);
          newAvgPeriod = Math.round(totalP / periods.length);
        }
        await supabase.from('health_profiles').update({ average_period_length: newAvgPeriod }).eq('user_id', user.id);
      }
      
    } catch (err) {
      console.error('Lỗi khi lưu chu kỳ:', err);
      showToast('Lỗi khi lưu dữ liệu lên Supabase: ' + err.message, 'error');
    }
  };

  const deletePeriod = async (targetDate) => {
    if (!isFemale) return;
    try {
      // Find which cycle this date belongs to
      const cycle = cycles.find(c => {
         if (!c.period_length) return false;
         const diff = getDaysDiff(c.start_date, targetDate);
         return diff >= 0 && diff < c.period_length;
      });
      
      if (!cycle) return;
      
      const diff = getDaysDiff(cycle.start_date, targetDate);
      
      if (cycle.period_length <= 1) {
         // Nếu chu kỳ chỉ có 1 ngày, xoá luôn chu kỳ đó
         await supabase.from('menstrual_cycles').delete().eq('id', cycle.id);
      } else if (diff === 0) {
         // Xoá ngày đầu -> tịnh tiến start_date lên 1 ngày, giảm period_length đi 1
         const newStart = addDays(cycle.start_date, 1);
         await supabase.from('menstrual_cycles').update({ start_date: newStart, period_length: cycle.period_length - 1 }).eq('id', cycle.id);
      } else if (diff === cycle.period_length - 1) {
         // Xoá ngày cuối -> giảm period_length đi 1
         await supabase.from('menstrual_cycles').update({ period_length: cycle.period_length - 1 }).eq('id', cycle.id);
      } else {
         // Xoá ngày ở giữa -> cắt bỏ luôn phần đuôi từ ngày đó trở đi
         await supabase.from('menstrual_cycles').update({ period_length: diff }).eq('id', cycle.id);
      }
      
    } catch (err) {
      console.error('Lỗi khi xóa chu kỳ:', err);
      showToast('Lỗi khi xóa dữ liệu trên Supabase: ' + err.message, 'error');
    }
  };

  const resetAllCycles = async () => {
    if (!isFemale) return;
    try {
      await supabase.from('menstrual_cycles').delete().eq('user_id', user.id);
      await supabase.from('symptoms_log').delete().eq('user_id', user.id);
      await supabase.from('health_profiles').update({ average_cycle_length: 28, average_period_length: 5 }).eq('user_id', user.id);
      showToast('Đã reset toàn bộ dữ liệu chu kỳ kinh nguyệt.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi reset: ' + err.message, 'error');
    }
  };

  const logSymptom = async (date, type, severity) => {
    if (!isFemale) return;
    const currentCycle = cycles.length > 0 ? cycles[0] : null;
    
    await supabase.from('symptoms_log').upsert({
      user_id: user.id,
      cycle_id: currentCycle?.id || null,
      log_date: date,
      symptom_type: type,
      severity: severity
    }, { onConflict: 'user_id,log_date,symptom_type' });
  };

  const updateProfile = async (updates) => {
    if (!isFemale) return;
    await supabase.from('health_profiles').update(updates).eq('user_id', user.id);
  };

  return {
    isFemale,
    isMale,
    isLoading,
    profile,
    cycles,
    symptoms,
    insight: null, // replaced by getInsightForDate
    getInsightForDate,
    actions: {
      startNewPeriod,
      deletePeriod,
      resetAllCycles,
      logSymptom,
      updateProfile
    }
  };
}
