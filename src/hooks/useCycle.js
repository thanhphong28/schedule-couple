import { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { MEDICAL_EVIDENCES } from '../data/medical_evidences.js';
import { showToast } from '../components/shared/Toast.jsx';

// Helpers
const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export function useCycle() {
  const { user, partner } = useAuth();
  useApp(); // keep context subscription active
  const [profile, setProfile] = useState(null);
  const [analyzedProfile, setAnalyzedProfile] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [analyzedCycles, setAnalyzedCycles] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAnalysis, setNeedsAnalysis] = useState(false); // Dirty flag: enable button when user edits
  const [analysisResult, setAnalysisResult] = useState(null); // Last analysis warnings
  const [lastEpisodeStart, setLastEpisodeStart] = useState(null); // Canonical start of last period episode

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
        // 1. Profile
        let { data: hp } = await supabase.from('health_profiles').select('*').eq('user_id', femaleId).single();
        if (!hp && isFemale) {
          const { data: newHp } = await supabase.from('health_profiles').insert([{ user_id: femaleId }]).select().single();
          hp = newHp;
        }
        setProfile(hp);
        setAnalyzedProfile(prev => prev === null ? hp : prev);

        // 2. Cycles (get all to ensure accurate cycle tracking, limit to 24)
        const { data: cyc } = await supabase.from('menstrual_cycles')
          .select('*')
          .eq('user_id', femaleId)
          .order('start_date', { ascending: false })
          .limit(24);
          
        // Parse excluded_dates from notes
        const parsedCycles = (cyc || []).map(c => {
          let parsedNotes = {};
          try { parsedNotes = JSON.parse(c.notes || '{}'); } catch(e) {}
          return {
            ...c,
            parsedNotes,
            excluded_dates: parsedNotes.excluded_dates || []
          };
        });
        setCycles(parsedCycles);
        setAnalyzedCycles(prev => prev === null ? parsedCycles : prev);

        // 3. Symptoms
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

    const channel = supabase.channel('health-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menstrual_cycles', filter: `user_id=eq.${femaleId}` }, () => {
        supabase.from('menstrual_cycles').select('*').eq('user_id', femaleId).order('start_date', { ascending: false }).limit(24)
          .then(({ data }) => {
            const parsedCycles = (data || []).map(c => {
              let parsedNotes = {};
              try { parsedNotes = JSON.parse(c.notes || '{}'); } catch(e) {}
              return { ...c, parsedNotes, excluded_dates: parsedNotes.excluded_dates || [] };
            });
            setCycles(parsedCycles);
          });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_profiles', filter: `user_id=eq.${femaleId}` }, () => {
        supabase.from('health_profiles').select('*').eq('user_id', femaleId).single()
          .then(({ data }) => setProfile(data));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'symptoms_log', filter: `user_id=eq.${femaleId}` }, () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        supabase.from('symptoms_log').select('*').eq('user_id', femaleId).gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
          .then(({ data }) => setSymptoms(data || []));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'symptoms_log', filter: `user_id=eq.${femaleId}` }, () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        supabase.from('symptoms_log').select('*').eq('user_id', femaleId).gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
          .then(({ data }) => setSymptoms(data || []));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'symptoms_log' }, (payload) => {
        if (payload.old && payload.old.id) {
          setSymptoms(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [femaleId, user, partner]);

  // ==========================================
  // INSIGHT ENGINE (CALENDAR & DASHBOARD)
  // ==========================================
  const getInsightForDate = (targetDateStr = new Date().toISOString().split('T')[0]) => {
    const baseProfile = analyzedProfile || profile;
    const baseCycles = analyzedCycles || cycles;
    
    if (!baseProfile) return null;

    let avgLength = baseProfile.average_cycle_length || 28;
    let avgPeriod = baseProfile.average_period_length || 5;
    
    // Sort ascending for easier sequential processing
    const ascCycles = [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const ascAnalyzedCycles = [...baseCycles].sort((a, b) => a.start_date.localeCompare(b.start_date));
    
    // 1. Check if the target date falls exactly inside a recorded cycle (REAL-TIME)
    const actualCycle = ascCycles.find(c => {
      const diff = getDaysDiff(c.start_date, targetDateStr);
      return diff >= 0 && diff < c.period_length;
    });

    if (actualCycle) {
      const isExcluded = actualCycle.excluded_dates.includes(targetDateStr);
      const cycleDay = getDaysDiff(actualCycle.start_date, targetDateStr) + 1;
      
      let nextStart = actualCycle.cycle_length 
        ? addDays(actualCycle.start_date, actualCycle.cycle_length)
        : addDays(actualCycle.start_date, avgLength);
        
      let ovulationDate = addDays(nextStart, -14);
      let currentPhase = 'follicular';

      if (!isExcluded && cycleDay <= actualCycle.period_length) {
        currentPhase = 'menstruation';
      } else if (targetDateStr >= addDays(ovulationDate, -2) && targetDateStr <= addDays(ovulationDate, 2)) {
        currentPhase = 'ovulation';
      } else if (targetDateStr > addDays(ovulationDate, 2)) {
        currentPhase = 'luteal';
      }

      return {
        avgLength, avgPeriod, currentCycle: actualCycle, cycleDay, nextPeriodStart: nextStart, ovulationDate,
        currentPhase, evidence: MEDICAL_EVIDENCES.phases[currentPhase],
        isConfirmedPeriod: currentPhase === 'menstruation',
        isExcluded,
        symptomsToday: symptoms.filter(s => s.log_date === targetDateStr)
      };
    }

    // 2. If not inside an actual cycle, use lastEpisodeStart (from analysis) as projection anchor
    // Falls back to latest analyzed cycle row if analysis hasn't run yet
    const projectionAnchor = lastEpisodeStart
      || (ascAnalyzedCycles.length > 0 ? ascAnalyzedCycles[ascAnalyzedCycles.length - 1].start_date : null);
    if (!projectionAnchor) return null;

    let refDate = projectionAnchor;
    let diffDays = getDaysDiff(refDate, targetDateStr);
    
    // Project into future or past based on average length
    if (diffDays >= 0) {
      const cyclesAhead = Math.floor(diffDays / avgLength);
      refDate = addDays(refDate, cyclesAhead * avgLength);
    } else {
      const cyclesBehind = Math.ceil(Math.abs(diffDays) / avgLength);
      refDate = addDays(refDate, -(cyclesBehind * avgLength));
    }
    
    const cycleDay = getDaysDiff(refDate, targetDateStr) + 1;
    const nextPeriodStart = addDays(refDate, avgLength);
    const ovulationDate = addDays(nextPeriodStart, -14);
    
    let currentPhase = 'follicular';
    let isPredictedPeriod = false;

    if (cycleDay > 0 && cycleDay <= avgPeriod) {
      currentPhase = 'menstruation';
      isPredictedPeriod = true;
    } else if (targetDateStr >= addDays(ovulationDate, -2) && targetDateStr <= addDays(ovulationDate, 2)) {
      currentPhase = 'ovulation';
    } else if (targetDateStr > addDays(ovulationDate, 2)) {
      currentPhase = 'luteal';
    }

    return {
      avgLength, avgPeriod,
      currentCycle: ascAnalyzedCycles[ascAnalyzedCycles.length - 1] || null,
      cycleDay, nextPeriodStart, ovulationDate,
      currentPhase, evidence: MEDICAL_EVIDENCES.phases[currentPhase],
      isConfirmedPeriod: false,
      isPredictedPeriod: isPredictedPeriod,
      isExcluded: false,
      symptomsToday: symptoms.filter(s => s.log_date === targetDateStr)
    };
  };

  const getCalendarStatus = (targetDateStr) => {
    // Fast path just for calendar UI to color the dots
    const insight = getInsightForDate(targetDateStr);
    if (!insight) return { isPeriod: false, isPredicted: false, isOvulation: false, isExcluded: false };
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      isPeriod: insight.isConfirmedPeriod,
      isPredicted: insight.isPredictedPeriod && targetDateStr >= today,
      isOvulation: insight.currentPhase === 'ovulation',
      isExcluded: insight.isExcluded
    };
  };

  // ==========================================
  // REAL-TIME MUTATIONS
  // ==========================================
  const togglePeriodDay = async (targetDate) => {
    if (!isFemale) return;
    
    try {
      // 1. Fetch the freshest data from DB to prevent race conditions
      let { data: allCycles } = await supabase.from('menstrual_cycles').select('*').eq('user_id', user.id).order('start_date', { ascending: true });
      allCycles = allCycles || [];

      // Parse notes
      allCycles.forEach(c => {
        try { c.parsedNotes = JSON.parse(c.notes || '{}'); } catch(e) { c.parsedNotes = {}; }
        c.excluded_dates = c.parsedNotes.excluded_dates || [];
      });

      // 2. Find if this date belongs to any cycle's SPAN, OR is adjacent (within 14 days)
      let targetCycle = null;
      let isCurrentlyActive = false;
      
      for (let c of allCycles) {
        const start = c.start_date;
        const end = addDays(start, c.period_length - 1);
        
        if (targetDate >= start && targetDate <= end) {
          targetCycle = c;
          isCurrentlyActive = !c.excluded_dates.includes(targetDate);
          break;
        }
        
        // Two date ranges: within span OR within 5 days of span edges
        // Reduced from 14 to 5: separate periods are NEVER merged across >5 days
        const diffToStart = getDaysDiff(targetDate, start);
        const diffToEnd = getDaysDiff(end, targetDate);
        if ((diffToStart > 0 && diffToStart <= 5) || (diffToEnd > 0 && diffToEnd <= 5)) {
          targetCycle = c;
          isCurrentlyActive = false;
          break;
        }
      }

      if (targetCycle) {
        // Generate current active days list
        let days = [];
        for (let i = 0; i < targetCycle.period_length; i++) {
          const d = addDays(targetCycle.start_date, i);
          if (!targetCycle.excluded_dates.includes(d)) days.push(d);
        }
        
        if (isCurrentlyActive) {
          // REMOVE the day
          days = days.filter(d => d !== targetDate);
        } else {
          // ADD the day
          if (!days.includes(targetDate)) days.push(targetDate);
        }
        
        days.sort();
        
        if (days.length === 0) {
          // Delete cycle completely
          await supabase.from('menstrual_cycles').delete().eq('id', targetCycle.id);
          allCycles = allCycles.filter(c => c.id !== targetCycle.id);
        } else {
          // Update cycle bounds
          const newStart = days[0];
          const newEnd = days[days.length - 1];
          const newLen = getDaysDiff(newStart, newEnd) + 1;
          const newExcluded = [];
          for (let i = 0; i < newLen; i++) {
            const d = addDays(newStart, i);
            if (!days.includes(d)) newExcluded.push(d);
          }
          
          targetCycle.start_date = newStart;
          targetCycle.period_length = newLen;
          targetCycle.parsedNotes.excluded_dates = newExcluded;
          targetCycle.notes = JSON.stringify(targetCycle.parsedNotes);
          
          await supabase.from('menstrual_cycles').update({
            start_date: targetCycle.start_date,
            period_length: targetCycle.period_length,
            notes: targetCycle.notes
          }).eq('id', targetCycle.id);
        }
      } else {
        // Create new cycle since it's far from any existing cycle
        const parsedNotes = { excluded_dates: [] };
        const newCycle = {
          user_id: user.id,
          start_date: targetDate,
          period_length: 1,
          is_active: true,
          notes: JSON.stringify(parsedNotes)
        };
        const { data: inserted } = await supabase.from('menstrual_cycles').insert([newCycle]).select().single();
        if (inserted) {
          inserted.parsedNotes = parsedNotes;
          inserted.excluded_dates = [];
          allCycles.push(inserted);
          allCycles.sort((a,b) => a.start_date.localeCompare(b.start_date));
        }
      }

      // RECALCULATE ALL CYCLE LENGTHS
      for (let i = 0; i < allCycles.length; i++) {
        let clen = null;
        let isActive = false;
        if (i < allCycles.length - 1) {
          clen = getDaysDiff(allCycles[i].start_date, allCycles[i+1].start_date);
        } else {
          isActive = true; // Last cycle is active
        }
        
        if (allCycles[i].cycle_length !== clen || allCycles[i].is_active !== isActive) {
          await supabase.from('menstrual_cycles').update({
            cycle_length: clen,
            is_active: isActive
          }).eq('id', allCycles[i].id);
        }
      }
      // Mark dirty so user knows analysis is needed
      setNeedsAnalysis(true);
    } catch (err) {
      console.error('Lỗi khi lưu chu kỳ:', err);
      showToast('Lỗi khi đồng bộ dữ liệu: ' + err.message, 'error');
    }
  };

  const startNewPeriod = async (startDate, periodLength = 5) => {
     if (!isFemale) return;
     try {
       await supabase.from('menstrual_cycles').insert([{
         user_id: user.id,
         start_date: startDate,
         period_length: periodLength,
         is_active: true,
         notes: JSON.stringify({ excluded_dates: [] })
       }]);
       await supabase.from('health_profiles').update({ average_period_length: periodLength }).eq('user_id', user.id);
       setNeedsAnalysis(true);
     } catch (err) {
       showToast('Lỗi khi lưu chu kỳ.', 'error');
     }
  };

  const resetAllCycles = async () => {
    if (!isFemale) return;
    try {
      await supabase.from('menstrual_cycles').delete().eq('user_id', user.id);
      await supabase.from('symptoms_log').delete().eq('user_id', user.id);
      await supabase.from('health_profiles').update({ average_cycle_length: 28, average_period_length: 5 }).eq('user_id', user.id);
      
      // Update local state immediately for snappy UX
      setCycles([]);
      setSymptoms([]);
      setProfile(prev => ({ ...prev, average_cycle_length: 28, average_period_length: 5 }));

      showToast('Đã reset toàn bộ dữ liệu chu kỳ kinh nguyệt.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi reset: ' + err.message, 'error');
    }
  };

  const logSymptom = async (date, type, severity) => {
    if (!isFemale) return;
    
    // Check if this symptom is already logged for this date
    const existing = symptoms.find(s => s.log_date === date && s.symptom_type === type);
    
    try {
      if (existing) {
        // Toggle OFF (delete) optimistically
        setSymptoms(prev => prev.filter(s => s.id !== existing.id));
        await supabase.from('symptoms_log').delete().eq('id', existing.id);
      } else {
        // Toggle ON (upsert) optimistically
        const currentCycle = cycles.length > 0 ? cycles[0] : null;
        const tempId = 'temp-' + Date.now();
        const payload = {
          user_id: user.id,
          cycle_id: currentCycle?.id || null,
          log_date: date,
          symptom_type: type,
          severity: severity
        };
        
        setSymptoms(prev => [...prev, { ...payload, id: tempId }]);
        
        const { data, error } = await supabase.from('symptoms_log').upsert(
          payload, 
          { onConflict: 'user_id,log_date,symptom_type' }
        ).select().single();
        
        // Update the temp id with the real id from db, or handle error
        if (!error && data) {
           setSymptoms(prev => prev.map(s => s.id === tempId ? data : s));
        } else if (error) {
           setSymptoms(prev => prev.filter(s => s.id !== tempId));
        }
      }
    } catch (err) {
      console.error("Lỗi cập nhật triệu chứng:", err);
    }
  };

  // ==========================================
  // CYCLE ANOMALY DETECTION
  // ==========================================
  const analyzeAnomalies = (dbCycles) => {
    const warnings = [];
    const completedCycles = dbCycles.filter(c => c.cycle_length != null);
    
    // 1. Two periods in same calendar month
    const byMonth = {};
    dbCycles.forEach(c => {
      const key = c.start_date.slice(0, 7); // YYYY-MM
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(c);
    });
    const monthsWith2Periods = Object.entries(byMonth).filter(([_, cycs]) => cycs.length >= 2);
    if (monthsWith2Periods.length > 0) {
      warnings.push({
        type: 'hormonal',
        severity: 'high',
        message: `Phát hiện ${monthsWith2Periods.length} tháng có 2 lần kinh nguyệt (${monthsWith2Periods.map(([m]) => m).join(', ')}). Đây có thể là dấu hiệu rối loạn nội tiết tố.`,
        advice: 'Nên gặp bác sĩ phụ khoa để kiểm tra hormone estrogen/progesterone và loại trừ bệnh lý như PCOS, u xơ tử cung hoặc rối loạn tuyến giáp.'
      });
    }
    
    // 2. Very short cycles (< 21 days)
    const shortCycles = completedCycles.filter(c => c.cycle_length < 21);
    if (shortCycles.length > 0) {
      warnings.push({
        type: 'short_cycle',
        severity: 'medium',
        message: `Phát hiện ${shortCycles.length} chu kỳ ngắn hơn 21 ngày (${shortCycles.map(c => c.cycle_length + ' ngày').join(', ')}).`,
        advice: 'Chu kỳ ngắn có thể liên quan đến rối loạn phóng noãn (anovulation), thiếu máu hoặc stress mãn tính.'
      });
    }
    
    // 3. Very long cycles (> 35 days)
    const longCycles = completedCycles.filter(c => c.cycle_length > 35);
    if (longCycles.length > 0) {
      warnings.push({
        type: 'long_cycle',
        severity: 'medium',
        message: `Phát hiện ${longCycles.length} chu kỳ dài hơn 35 ngày (${longCycles.map(c => c.cycle_length + ' ngày').join(', ')}).`,
        advice: 'Chu kỳ dài thường liên quan đến hội chứng buồng trứng đa nang (PCOS), thiếu cân hoặc rối loạn hormone.'
      });
    }
    
    // 4. High variability between cycles
    if (completedCycles.length >= 3) {
      const last3 = completedCycles.slice(-3);
      const lengths = last3.map(c => c.cycle_length);
      if (Math.max(...lengths) - Math.min(...lengths) > 7) {
        warnings.push({
          type: 'irregular',
          severity: 'medium',
          message: `Chu kỳ không đều (biên độ dao động ${Math.max(...lengths) - Math.min(...lengths)} ngày trong 3 tháng gần nhất).`,
          advice: 'Kinh nguyệt không đều có thể do stress, thay đổi cân nặng đột ngột, hoặc các bệnh lý phụ khoa. Theo dõi thêm 2-3 chu kỳ và tham khảo bác sĩ nếu tiếp tục.'
        });
      }
    }
    
    return warnings;
  };

  const checkIrregularity = () => {
    // Only completed cycles (not active) have a cycle_length
    const completedCycles = cycles.filter(c => c.cycle_length != null);
    if (completedCycles.length < 2) return null;
    
    const last3 = completedCycles.slice(0, 3); // Cycles are sorted desc
    const lengths = last3.map(c => c.cycle_length);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);
    if (max - min > 7) return 'Chu kỳ gần đây có sự thay đổi đáng kể (chênh lệch > 7 ngày).';
    if (lengths.some(l => l < 21)) return 'Chu kỳ của bạn đang ngắn hơn bình thường (< 21 ngày).';
    if (lengths.some(l => l > 35)) return 'Chu kỳ của bạn đang dài hơn bình thường (> 35 ngày).';
    return null;
  };

  // ==========================================
  // FORCE ANALYZE: Episode-Clustering Algorithm
  // ==========================================
  const forceAnalyzeCycles = async () => {
    if (!isFemale) return;
    try {
      showToast('Đang phân tích chu kỳ...', 'success');

      // STEP 1: Fetch all cycle rows ordered by start_date asc
      const { data: rawCycles, error } = await supabase
        .from('menstrual_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      if (!rawCycles || rawCycles.length === 0) {
        showToast('Chưa có dữ liệu chu kỳ để phân tích.', 'error');
        return;
      }

      const dbCycles = rawCycles.map(c => {
        let pn = {};
        try { pn = JSON.parse(c.notes || '{}'); } catch(e) {}
        return { ...c, parsedNotes: pn, excluded_dates: pn.excluded_dates || [] };
      });

      // STEP 2: Expand all cycle rows into individual marked days
      // This is the key: we work on actual days, not DB rows
      // So merged rows (with excluded_dates) are handled correctly
      const markedDaysSet = new Set();
      dbCycles.forEach(c => {
        for (let i = 0; i < (parseInt(c.period_length) || 0); i++) {
          const d = addDays(c.start_date, i);
          if (!c.excluded_dates.includes(d)) markedDaysSet.add(d);
        }
      });
      const markedDays = [...markedDaysSet].sort();

      if (markedDays.length === 0) {
        showToast('Chưa có ngày hành kinh nào được đánh dấu.', 'error');
        return;
      }

      // STEP 3: Cluster consecutive marked days into period EPISODES
      // Days with gap > 7 days = start of a new episode (new period event)
      const episodes = [];
      markedDays.forEach(day => {
        const lastEp = episodes[episodes.length - 1];
        if (!lastEp) {
          episodes.push([day]);
        } else {
          const lastDay = lastEp[lastEp.length - 1];
          if (getDaysDiff(lastDay, day) <= 7) {
            lastEp.push(day);
          } else {
            episodes.push([day]);
          }
        }
      });

      // STEP 4: For each episode, canonical start = first day, period days = count
      const analyzedEps = episodes.map(ep => ({
        start: ep[0],
        end: ep[ep.length - 1],
        periodDays: ep.length
      }));

      // STEP 5: Compute intervals between episode canonical starts
      const intervals = [];
      for (let i = 0; i < analyzedEps.length - 1; i++) {
        intervals.push({
          days: getDaysDiff(analyzedEps[i].start, analyzedEps[i + 1].start),
          fromStart: analyzedEps[i].start,
          toStart: analyzedEps[i + 1].start
        });
      }

      // STEP 6: Separate normal (21-45) vs anomalous intervals
      const normalIntervals = intervals.filter(iv => iv.days >= 21 && iv.days <= 45);
      const anomalousIntervals = intervals.filter(iv => iv.days < 21 || iv.days > 45);

      // STEP 7: Avg cycle = last 3 normal intervals (fallback: all if no normal ones)
      const useForAvg = normalIntervals.length >= 1 ? normalIntervals.slice(-3) : intervals.slice(-3);
      let newAvgCycle = 28;
      if (useForAvg.length > 0) {
        newAvgCycle = Math.round(useForAvg.reduce((s, iv) => s + iv.days, 0) / useForAvg.length);
      }

      // STEP 8: Avg period = last 3 episodes
      const last3Eps = analyzedEps.slice(-3);
      let newAvgPeriod = 5;
      if (last3Eps.length > 0) {
        newAvgPeriod = Math.round(last3Eps.reduce((s, ep) => s + ep.periodDays, 0) / last3Eps.length);
      }

      // STEP 9: Write canonical cycle_length back to DB rows
      // Each DB row gets the cycle_length of the EPISODE it belongs to
      const lastEpisodeStartDate = analyzedEps[analyzedEps.length - 1].start;
      for (let i = 0; i < analyzedEps.length; i++) {
        const isLastEp = i === analyzedEps.length - 1;
        const clen = isLastEp ? null : intervals[i]?.days ?? null;
        // Find DB rows whose start_date falls within this episode's day range
        dbCycles.forEach(async (row) => {
          const rowStart = row.start_date;
          if (rowStart >= analyzedEps[i].start && rowStart <= analyzedEps[i].end) {
            await supabase.from('menstrual_cycles')
              .update({ cycle_length: clen, is_active: isLastEp })
              .eq('id', row.id);
          }
        });
      }
      // Wait for all DB writes to flush
      await new Promise(r => setTimeout(r, 400));

      // STEP 10: Update health_profiles in DB
      await supabase.from('health_profiles')
        .update({ average_cycle_length: newAvgCycle, average_period_length: newAvgPeriod })
        .eq('user_id', user.id);

      // STEP 11: Detect anomalies based on EPISODES (not DB rows)
      const warnings = [];
      
      // 2+ episodes in same calendar month → tag with monthKey so UI only shows it on that month
      const byMonth = {};
      analyzedEps.forEach(ep => {
        const key = ep.start.slice(0, 7);
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(ep);
      });
      Object.entries(byMonth)
        .filter(([_, eps]) => eps.length >= 2)
        .forEach(([month, eps]) => {
          const [y, m] = month.split('-');
          warnings.push({
            type: 'hormonal', severity: 'high',
            monthKey: month, // Only display when viewing this month
            message: `Tháng ${m}/${y} có ${eps.length} lần hành kinh — chu kỳ ngắn bất thường.`,
            advice: '💧 Uống đủ 2L nước/ngày · 🧘 Thử yoga hoặc thiền 10 phút/tối để giảm cortisol · 🥗 Bổ sung thực phẩm giàu sắt & magie (rau lá xanh, hạt bí) · 😴 Ngủ đủ 7–8 tiếng để hỗ trợ cân bằng nội tiết.'
          });
        });
      
      // Short intervals → show on the target month
      anomalousIntervals.filter(iv => iv.days < 21).forEach(iv => {
        const targetMonth = iv.toStart ? iv.toStart.slice(0, 7) : null;
        warnings.push({
          type: 'short_cycle', severity: 'medium',
          monthKey: targetMonth,
          message: `Kỳ kinh xuất hiện sớm hơn dự kiến (chỉ sau ${iv.days} ngày).`,
          advice: '🏃‍♀️ Duy trì vận động nhẹ như đi bộ 30 phút/ngày · 🌿 Hạn chế đồ uống có cồn và caffeine · 🥦 Tăng cường omega-3 (cá hồi, hạt lanh) giúp ổn định hormone · 📓 Ghi chú thêm triệu chứng để theo dõi xu hướng.'
        });
      });
      
      // Long intervals
      anomalousIntervals.filter(iv => iv.days > 45).forEach(iv => {
        const targetMonth = iv.toStart ? iv.toStart.slice(0, 7) : null;
        warnings.push({
          type: 'long_cycle', severity: 'medium',
          monthKey: targetMonth,
          message: `Chu kỳ kéo dài hơn bình thường (${iv.days} ngày).`,
          advice: '🌞 Phơi nắng 15 phút/sáng để bổ sung vitamin D · 🏋️ Tập cardio nhẹ 3–4 lần/tuần hỗ trợ phóng noãn · 🥜 Ăn thực phẩm giàu kẽm (hạt bí, đậu lăng) để cân bằng progesterone · 📊 Theo dõi cân nặng — sụt cân đột ngột cũng có thể làm trễ kinh.'
        });
      });
      
      // High variability in normal cycles (no specific month, always visible)
      if (normalIntervals.length >= 2) {
        const lens = normalIntervals.map(iv => iv.days);
        const variance = Math.max(...lens) - Math.min(...lens);
        if (variance > 7) {
          warnings.push({
            type: 'irregular', severity: 'medium',
            // No monthKey → shown on every month as general advice
            message: `Chu kỳ dao động ${Math.min(...lens)}–${Math.max(...lens)} ngày — chênh ${variance} ngày giữa các kỳ.`,
            advice: '🧘 Stress là nguyên nhân phổ biến nhất — thử hít thở sâu 4-7-8 mỗi tối · 🛌 Ưu tiên ngủ đúng giờ và đủ giấc · 🥗 Ổn định cân nặng và tránh ăn kiêng cực đoan · ☀️ Bổ sung vitamin D & B6 giúp ổn định chu kỳ.'
          });
        }
      }


      // STEP 12: Refetch cycles, update ALL state
      const { data: refreshed } = await supabase
        .from('menstrual_cycles').select('*')
        .eq('user_id', user.id).order('start_date', { ascending: false }).limit(48);
      const parsedRefreshed = (refreshed || []).map(c => {
        let pn = {};
        try { pn = JSON.parse(c.notes || '{}'); } catch(e) {}
        return { ...c, parsedNotes: pn, excluded_dates: pn.excluded_dates || [] };
      });

      const updatedProfile = { ...profile, average_cycle_length: newAvgCycle, average_period_length: newAvgPeriod };
      setProfile(updatedProfile);
      setAnalyzedProfile(updatedProfile);
      setCycles(parsedRefreshed);
      setAnalyzedCycles(parsedRefreshed);
      setLastEpisodeStart(lastEpisodeStartDate); // KEY: anchor for future projections
      setAnalysisResult({
        avgCycle: newAvgCycle,
        avgPeriod: newAvgPeriod,
        episodeCount: analyzedEps.length,
        intervals: intervals.map(iv => iv.days),
        warnings,
        analyzedAt: new Date().toISOString()
      });
      setNeedsAnalysis(false);

      if (warnings.length > 0) {
        showToast(`Phân tích xong! ${warnings.length} điểm bất thường cần chú ý.`, 'error');
      } else {
        showToast(`Phân tích xong! Vòng kinh TB: ${newAvgCycle} ngày | Hành kinh: ${newAvgPeriod} ngày`, 'success');
      }
    } catch (err) {
      console.error('forceAnalyzeCycles error:', err);
      showToast('Lỗi phân tích: ' + (err.message || String(err)), 'error');
    }
  };

  return {
    isFemale,
    isMale,
    isLoading,
    profile,
    cycles,
    symptoms,
    needsAnalysis,
    analysisResult,
    getInsightForDate,
    getCalendarStatus,
    irregularityWarning: checkIrregularity(),
    actions: {
      togglePeriodDay,
      startNewPeriod,
      resetAllCycles,
      logSymptom,
      forceAnalyzeCycles
    }
  };
}
