// components/tabs/Tab5Health.jsx
// Trung tâm Sức Khỏe & Chăm Sóc Đôi (Couple Health & Wellness Ecosystem)
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCycle } from '../../hooks/useCycle.js';
import { useHealth } from '../../hooks/useHealth.js';

// Sub-components
import HydrationCouple from '../health/HydrationCouple.jsx';
import CycleHealthCard from '../health/CycleHealthCard.jsx';
import WeightGoalCard from '../health/WeightGoalCard.jsx';
import BodySilhouetteCard from '../health/BodySilhouetteCard.jsx';
import CalorieInsights from '../health/CalorieInsights.jsx';
import HealthCharts from '../health/HealthCharts.jsx';
import ConnectedDevices from '../health/ConnectedDevices.jsx';
import CoupleHealthSharing from '../health/CoupleHealthSharing.jsx';
import HealthProfileWizard from '../health/HealthProfileWizard.jsx';
import RomanticDatePickerField from '../shared/RomanticDatePickerField.jsx';

import {
  HeartPulse,
  Droplets,
  CalendarClock,
  BarChart2,
  Smile,
  Frown,
  Coffee,
  Info,
  ChevronLeft,
  ChevronRight,
  Settings,
  AlertTriangle,
  CheckCircle,
  Activity,
  Sparkles,
  Sliders
} from 'lucide-react';

// ==========================================
// COMPONENT: ONBOARDING CHO BẠN NỮ
// ==========================================
function Onboarding({ onComplete }) {
  const [lastPeriod, setLastPeriod] = useState(new Date().toISOString().split('T')[0]);
  const [periodLength, setPeriodLength] = useState(5);

  return (
    <div className="glass-panel p-6 rounded-[32px] animate-fade-in mt-4 shadow-[0_8px_30px_rgba(244,63,94,0.1)]">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30">
          <HeartPulse size={32} className="text-white" />
        </div>
      </div>
      <h2 className="text-xl font-black text-white text-center mb-2">Chào mừng bạn!</h2>
      <p className="text-sm text-zinc-400 text-center mb-6 leading-relaxed">
        Để hệ thống có thể phân tích và đưa ra lời khuyên chính xác nhất cho sức khỏe của bạn và người ấy, hãy cung cấp một chút thông tin nhé.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-rose-300 mb-1">Ngày bắt đầu kỳ kinh gần nhất</label>
          <RomanticDatePickerField 
            value={lastPeriod}
            onChange={setLastPeriod}
            title="Ngày bắt đầu kỳ kinh gần nhất"
            placeholder="Chọn ngày bắt đầu kỳ kinh..."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-rose-300 mb-1">Kỳ kinh thường kéo dài mấy ngày?</label>
          <input 
            type="number" 
            value={periodLength}
            onChange={(e) => setPeriodLength(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors font-bold"
          />
        </div>
      </div>

      <button 
        onClick={() => onComplete(lastPeriod, periodLength)}
        className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
      >
        Bắt đầu phân tích
      </button>
    </div>
  );
}

// ==========================================
// COMPONENT: LỊCH CHU KỲ (CALENDAR)
// ==========================================
function HealthCalendar({ cycles, getInsightForDate, getCalendarStatus, selectedDateStr, onSelectDate, onMonthChange }) {
  const [currentDate, setCurrentDate] = useState(() => new Date(selectedDateStr));
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const goToMonth = (newDate) => {
    setCurrentDate(newDate);
    const key = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange?.(key);
  };

  const prevMonth = () => goToMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => goToMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const getDayStatus = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    
    if (!getCalendarStatus) return { isToday };
    
    const status = getCalendarStatus(dateStr);
    
    return { 
      isToday, 
      isPeriod: status.isPeriod, 
      isPredictedPeriod: status.isPredicted, 
      isOvulation: status.isOvulation,
      isExcluded: status.isExcluded
    };
  };

  return (
    <div className="glass-panel p-4 rounded-[28px] border border-rose-500/20 shadow-[0_8px_30px_rgba(244,63,94,0.05)]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={prevMonth} className="p-1.5 bg-zinc-800/50 rounded-full hover:bg-zinc-700 text-zinc-300">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <button onClick={nextMonth} className="p-1.5 bg-zinc-800/50 rounded-full hover:bg-zinc-700 text-zinc-300">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] text-center text-zinc-500 font-bold uppercase">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const status = getDayStatus(dateStr);
          const isSelected = dateStr === selectedDateStr;
          
          let bgClass = "bg-transparent text-zinc-300 hover:bg-zinc-800 cursor-pointer";
          let borderClass = "border border-transparent";
          
          if (status?.isExcluded) {
             bgClass = "bg-zinc-900 text-zinc-500 cursor-pointer line-through opacity-70";
             borderClass = "border border-zinc-800 border-dashed";
          } else if (status?.isPeriod) {
            bgClass = "bg-rose-500/20 text-rose-400 font-bold";
            borderClass = "border border-rose-500/50";
          } else if (status?.isPredictedPeriod) {
            bgClass = "bg-pink-500/30 text-pink-100 border-dashed border-2 border-pink-400 font-bold shadow-[inset_0_0_8px_rgba(236,72,153,0.3)]";
          } else if (status?.isOvulation) {
            bgClass = "bg-purple-500/20 text-purple-300";
            borderClass = "border border-purple-500/50";
          }

          if (isSelected) {
            borderClass = "border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]";
            bgClass = bgClass.replace('bg-transparent', 'bg-zinc-800');
            bgClass += " font-black z-10 scale-110";
          } else if (status?.isToday) {
            borderClass = "border border-white/50 ring-1 ring-rose-500/20";
            bgClass += " font-black";
          }

          return (
            <button 
              key={day} 
              onClick={() => onSelectDate(dateStr)}
              className={`h-9 flex items-center justify-center rounded-xl text-xs transition-all focus:outline-none ${bgClass} ${borderClass}`}
            >
              <span className={status?.isExcluded ? "line-through" : ""}>{day}</span>
            </button>
          );
        })}
      </div>

      {/* Chú thích */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-zinc-800/50 text-[10px] font-medium text-zinc-400">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-rose-500/50 border border-rose-500"></div> Hành kinh</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-pink-500/20 border border-pink-500 border-dashed"></div> Dự kiến</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800 border-dashed line-through"></div> Đã xóa</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-500/40 border border-purple-500"></div> Rụng trứng</div>
      </div>
    </div>
  );
}

// Mapping triệu chứng
const SYMPTOM_OPTIONS = [
  { id: 'cramps', icon: '😣', label: 'Đau bụng' },
  { id: 'mood', icon: '😤', label: 'Dễ cáu' },
  { id: 'fatigue', icon: '🥱', label: 'Mệt mỏi' },
  { id: 'cravings', icon: '🤤', label: 'Thèm ăn' },
  { id: 'sensitive', icon: '🥺', label: 'Tủi thân' },
  { id: 'headache', icon: '🤕', label: 'Đau đầu' },
  { id: 'sleepy', icon: '😴', label: 'Buồn ngủ' },
  { id: 'happy', icon: '🥰', label: 'Vui vẻ' },
  { id: 'nausea', icon: '🤢', label: 'Buồn nôn' },
  { id: 'sad', icon: '😢', label: 'Buồn bã' },
  { id: 'stressed', icon: '😫', label: 'Căng thẳng' },
  { id: 'lonely', icon: '🥺', label: 'Cô đơn' },
  { id: 'anxious', icon: '😰', label: 'Lo âu' },
  { id: 'angry', icon: '🤬', label: 'Giận dữ' },
  { id: 'romantic', icon: '😘', label: 'Lãng mạn' },
  { id: 'bloated', icon: '🎈', label: 'Đầy hơi' },
  { id: 'backpain', icon: '🦴', label: 'Đau lưng' }
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Tab5Health() {
  const { user, partner } = useAuth();
  
  // Dữ liệu chu kỳ kinh nguyệt
  const {
    isFemale,
    isMale,
    isLoading: isCycleLoading,
    getInsightForDate,
    getCalendarStatus,
    irregularityWarning,
    actions: cycleActions,
    profile: cycleProfile,
    cycles,
    needsAnalysis,
    analysisResult
  } = useCycle();

  // Dữ liệu sức khỏe, nước uống, cân nặng & smartwatch
  const {
    todayStr,
    isLoading: isHealthLoading,
    myProfile,
    partnerProfile,
    myTodayWater,
    partnerTodayWater,
    myWaterGoal,
    partnerWaterGoal,
    myWaterLogs,
    partnerWaterLogs,
    weeklyWaterHistory,
    weightLogs,
    partnerWeightLogs,
    myActivity,
    partnerActivity,
    actions: healthActions
  } = useHealth();

  // Tab con điều hướng
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'cycle' | 'metrics'
  const [metricsPerson, setMetricsPerson] = useState('me'); // 'me' | 'partner'

  const myGender = user?.gender 
    ? (user.gender === 'FEMALE' || user.gender === 'Nữ' || user.gender === 'female' ? 'female' : 'male') 
    : (isFemale ? 'female' : 'male');
  const partnerGender = partner?.gender 
    ? (partner.gender === 'FEMALE' || partner.gender === 'Nữ' || partner.gender === 'female' ? 'female' : 'male') 
    : (myGender === 'male' ? 'female' : 'male');

  const isViewingMe = metricsPerson === 'me';
  const activeProfile = isViewingMe ? myProfile : partnerProfile;
  const activeGender = isViewingMe ? myGender : partnerGender;
  const activeWeightLogs = isViewingMe ? weightLogs : (partnerWeightLogs || []);
  const activeActivity = isViewingMe ? myActivity : partnerActivity;
  const activeName = isViewingMe 
    ? (user?.display_name || user?.full_name || 'Bạn') 
    : (partner?.display_name || partner?.full_name || 'Người yêu');

  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [showWizard, setShowWizard] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [viewingMonthKey, setViewingMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const cycleInsight = getInsightForDate ? getInsightForDate(selectedDateStr) : null;
  const isLoading = isCycleLoading || isHealthLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-24 animate-pulse">
        <HeartPulse className="text-rose-400 mb-4 animate-bounce" size={44} />
        <p className="text-zinc-300 font-bold text-sm">Đang đồng bộ dữ liệu sức khỏe...</p>
        <p className="text-zinc-500 text-xs mt-1">Chu kỳ & Bình nước đôi</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 px-1 animate-fade-in pb-12">
      {/* 1. HEADER CHÍNH CỦA TAB SỨC KHỎE */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-sky-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <HeartPulse size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">Sức Khỏe & Chăm Sóc</h1>
            <p className="text-xs text-rose-300 font-medium tracking-wide">
              {isFemale ? 'Chăm sóc bản thân & Đồng hành cùng người yêu' : 'Trợ lý sức khỏe & Chăm sóc người yêu'}
            </p>
          </div>
        </div>

        {/* Nút thiết lập hồ sơ */}
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 rounded-2xl transition-colors shadow-sm"
          title="Cài đặt hồ sơ sức khỏe cá nhân"
        >
          <Sliders size={16} />
        </button>
      </div>

      {/* 2. SUB-NAVIGATION PILLS (3 Tab con linh hoạt, mượt mà trên điện thoại) */}
      <div className="flex p-1 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'overview'
              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Droplets size={13} />
          <span>Tổng Quan & Nước</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('cycle')}
          className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'cycle'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <HeartPulse size={13} />
          <span>Chu Kỳ & Care</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('metrics')}
          className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'metrics'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart2 size={13} />
          <span>Chỉ Số & Xu Hướng</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TỪNG SUB-TAB */}

      {/* TAB 1: TỔNG QUAN & NƯỚC UỐNG (OVERVIEW & HYDRATION) */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* A. Hai Bình Nước Cặp Đôi (Hydration Couple) */}
          <HydrationCouple
            user={user}
            partner={partner}
            myTodayWater={myTodayWater}
            partnerTodayWater={partnerTodayWater}
            myWaterGoal={myWaterGoal}
            partnerWaterGoal={partnerWaterGoal}
            myWaterLogs={myWaterLogs}
            partnerWaterLogs={partnerWaterLogs}
            myProfile={myProfile}
            actions={healthActions}
          />

          {/* B. Chăm Sóc & Động Viên Cặp Đôi (Cheers) */}
          <CoupleHealthSharing
            partner={partner}
            onSendCheer={healthActions.sendCheer}
          />

          {/* C. Đồng Hồ Thông Minh (Ở dưới cùng) */}
          <ConnectedDevices
            myActivity={myActivity}
            partnerActivity={partnerActivity}
            partner={partner}
            onSyncActivity={healthActions.logActivity}
            onSendCheer={healthActions.sendCheer}
          />
        </div>
      )}

      {/* TAB 2: CHU KỲ KINH NGUYỆT & COUPLE CARE */}
      {activeSubTab === 'cycle' && (
        <div className="space-y-4 animate-fade-in">
          {/* Trợ lý chăm sóc chu kỳ */}
          <CycleHealthCard
            user={user}
            partner={partner}
            isFemale={isFemale}
            cycleInsight={cycleInsight}
            waterStats={{ current: myTodayWater, goal: myWaterGoal }}
            activityData={myActivity}
            profile={myProfile}
          />
          {/* Cảnh báo y khoa */}
          {showDisclaimer && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed relative">
              <button onClick={() => setShowDisclaimer(false)} className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white">✕</button>
              <strong className="text-white block mb-1">Cảnh báo Y khoa (Disclaimer):</strong>
              Thông tin và dự đoán trên ứng dụng dựa trên các nghiên cứu y khoa (ACOG, WHO, NHS) và lịch sử của bạn. Nó chỉ mang tính tham khảo, KHÔNG thay thế chẩn đoán y khoa chuyên môn.
            </div>
          )}

          {/* DÀNH CHO NỮ */}
          {isFemale && (
            <div className="space-y-4">
              <div className="flex justify-end pr-1">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 bg-zinc-800/80 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-rose-500/30 flex items-center gap-1"
                >
                  <Settings size={13} /> Khởi tạo lại chu kỳ
                </button>
              </div>

              {cycles.length === 0 ? (
                <Onboarding onComplete={(lp, pl) => cycleActions.startNewPeriod(lp, pl)} />
              ) : (
                <>
                  {/* Lịch chu kỳ */}
                  <HealthCalendar 
                    cycles={cycles}
                    getInsightForDate={getInsightForDate}
                    getCalendarStatus={getCalendarStatus}
                    selectedDateStr={selectedDateStr}
                    onSelectDate={setSelectedDateStr}
                    onMonthChange={setViewingMonthKey}
                  />

                  {/* Thanh thao tác ngày đang chọn */}
                  <div className="flex justify-between items-center px-2 py-1">
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        {selectedDateStr === todayStr ? 'Hôm nay' : formatDate(selectedDateStr)}
                      </h2>
                      <p className="text-xs text-zinc-400">
                        {cycleInsight?.cycleDay > 0 ? `Ngày thứ ${cycleInsight.cycleDay} của chu kỳ` : 'Ngoài chu kỳ ghi nhận'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {cycleInsight?.isConfirmedPeriod ? (
                        <button 
                          onClick={() => cycleActions.togglePeriodDay(selectedDateStr)}
                          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                          - Xóa ngày
                        </button>
                      ) : (
                        <button 
                          onClick={() => cycleActions.togglePeriodDay(selectedDateStr)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-500/20 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                          + Kinh nguyệt
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Phân tích chu kỳ */}
                  <div className="glass-panel p-5 rounded-3xl border border-rose-500/20">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <BarChart2 size={16} className="text-rose-400"/> Phân tích chu kỳ
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-zinc-900/60 p-3 rounded-2xl text-center border border-zinc-800">
                        <span className="text-xl font-black text-white">{cycleProfile?.average_cycle_length || 28}</span>
                        <span className="text-[10px] text-zinc-400 font-medium block">Vòng kinh TB (ngày)</span>
                      </div>
                      <div className="bg-zinc-900/60 p-3 rounded-2xl text-center border border-zinc-800">
                        <span className="text-xl font-black text-rose-400">{cycleProfile?.average_period_length || 5}</span>
                        <span className="text-[10px] text-zinc-400 font-medium block">Hành kinh TB (ngày)</span>
                      </div>
                    </div>

                    {irregularityWarning ? (
                      <div className="flex gap-2 items-start bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">{irregularityWarning}</p>
                      </div>
                    ) : cycles.length >= 3 ? (
                      <div className="flex gap-2 items-start bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-emerald-200/90 leading-relaxed font-medium">Chu kỳ của bạn đang rất đều đặn dựa trên 3 tháng gần nhất.</p>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-start bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                        <Info size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">Cần ghi nhận ít nhất 3 chu kỳ để hệ thống đánh giá độ đều đặn.</p>
                      </div>
                    )}

                    {cycles.length >= 1 && (
                      <button 
                        onClick={() => needsAnalysis && cycleActions.forceAnalyzeCycles()}
                        disabled={!needsAnalysis}
                        className={`w-full mt-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                          needsAnalysis
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500/40 shadow-lg shadow-rose-500/20 active:scale-95'
                            : 'bg-zinc-900/60 text-zinc-600 border-zinc-800/50 cursor-not-allowed'
                        }`}
                      >
                        {needsAnalysis ? '🔍 Cập nhật & Phân tích chu kỳ' : '✔️ Đã phân tích cập nhật'}
                      </button>
                    )}
                  </div>

                  {/* Lời khuyên y khoa dành cho bạn nữ */}
                  {cycleInsight?.evidence && (
                    <div className="glass-panel p-5 rounded-3xl border-l-4 border-rose-500">
                      <span className="px-2.5 py-1 bg-white/10 rounded-lg text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                        Giai đoạn: {cycleInsight.evidence.name}
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed my-3">
                        {cycleInsight.evidence.female_insight}
                      </p>
                      
                      <div className="space-y-2.5">
                        {cycleInsight.evidence.recommendations?.map((rec) => (
                          <div key={rec.id} className="bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800">
                            <h4 className="text-xs font-bold text-rose-300 mb-1">{rec.title}</h4>
                            <p className="text-[11px] text-zinc-400 leading-relaxed mb-1">{rec.content}</p>
                            <span className="text-[9px] text-zinc-600 italic">Nguồn: {rec.source_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ghi nhận triệu chứng */}
                  <div className="glass-panel p-5 rounded-3xl">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Smile size={16} className="text-amber-400"/> Bạn cảm thấy thế nào hôm nay?
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {SYMPTOM_OPTIONS.map(symp => {
                        const isSelected = cycleInsight?.symptomsToday?.some(s => s.symptom_type === symp.id);
                        return (
                          <button 
                            key={symp.id}
                            onClick={() => cycleActions.logSymptom(selectedDateStr, symp.id, 'moderate')}
                            className={`py-2 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all border ${
                              isSelected 
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm' 
                                : 'bg-zinc-800/40 hover:bg-zinc-800 border-transparent text-zinc-300'
                            }`}
                          >
                            <span className="text-xl">{symp.icon}</span>
                            <span className="text-[10px] font-medium">{symp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* DÀNH CHO BẠN NAM */}
          {isMale && (
            <div className="space-y-4">
              <HealthCalendar 
                cycles={cycles}
                getInsightForDate={getInsightForDate}
                getCalendarStatus={getCalendarStatus}
                selectedDateStr={selectedDateStr}
                onSelectDate={setSelectedDateStr}
              />

              {/* Status Card cho Nam */}
              <div className="glass-panel p-5 rounded-3xl border border-rose-500/20">
                <span className="text-zinc-400 text-xs font-bold uppercase block mb-1">
                  {selectedDateStr === todayStr ? 'Hôm nay' : `Ngày ${formatDate(selectedDateStr)}`}
                </span>
                <h2 className="text-xl font-black text-white mb-2">
                  Ngày thứ {cycleInsight?.cycleDay > 0 ? cycleInsight.cycleDay : '--'} của chu kỳ cô ấy
                </h2>

                {cycleInsight?.evidence && (
                  <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold mb-3">
                    Giai đoạn: {cycleInsight.evidence.name}
                  </span>
                )}

                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {cycleInsight?.evidence?.male_insight || 'Chưa có thông tin. Hãy nhắc cô ấy cập nhật lịch nhé!'}
                </p>
              </div>

              {/* Couple care tips */}
              {cycleInsight?.evidence?.couple_care_tips && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-md">
                  <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                    <Coffee size={16} /> Gợi ý hành động yêu thương
                  </h3>
                  <ul className="space-y-3">
                    {cycleInsight.evidence.couple_care_tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{tip}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHỈ SỐ CƠ THỂ & XU HƯỚNG (METRICS & TRENDS) */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-4 animate-fade-in pb-32">
          {/* Segmented Switcher chuyển đổi xem 2 người trong cặp đôi */}
          <div className="flex p-1.5 bg-zinc-900/90 rounded-2xl border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setMetricsPerson('me')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                isViewingMe
                  ? (myGender === 'male'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25')
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-sm">{myGender === 'male' ? '👦' : '👧'}</span>
              <span className="truncate">{user?.display_name || user?.full_name || 'Tôi'} ({myGender === 'male' ? 'Nam' : 'Nữ'})</span>
            </button>

            <button
              type="button"
              onClick={() => setMetricsPerson('partner')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                !isViewingMe
                  ? (partnerGender === 'male'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25')
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="text-sm">{partnerGender === 'male' ? '👦' : '👧'}</span>
              <span className="truncate">{partner?.display_name || partner?.full_name || 'Đối phương'} ({partnerGender === 'male' ? 'Nam' : 'Nữ'})</span>
            </button>
          </div>

          {/* Mô phỏng khung cơ thể người 3D sinh học theo Chiều cao & Cân nặng */}
          <BodySilhouetteCard
            profile={activeProfile}
            gender={activeGender}
            isMe={isViewingMe}
            name={activeName}
            partner={partner}
            onUpdateProfile={healthActions.updateProfile}
            onOpenWizard={() => setShowWizard(true)}
            onSendCheer={healthActions.sendCheer}
            onLogWeight={healthActions.logWeight}
          />

          {/* Card Cân nặng & Mục tiêu */}
          <WeightGoalCard
            profile={activeProfile}
            weightLogs={activeWeightLogs}
            onLogWeight={healthActions.logWeight}
            onOpenWizard={() => setShowWizard(true)}
            isReadOnly={!isViewingMe}
            personName={activeName}
          />

          {/* Phân tích Calo, BMR & TDEE */}
          <CalorieInsights
            profile={activeProfile}
            userGender={activeGender}
            activityData={activeActivity}
          />

          {/* Biểu đồ xu hướng từ dữ liệu thật */}
          <HealthCharts
            weeklyWaterHistory={weeklyWaterHistory}
            weightLogs={activeWeightLogs}
            myWaterGoal={myWaterGoal}
          />
        </div>
      )}

      {/* WIZARD THIẾT LẬP HỒ SƠ SỨC KHỎE */}
      <HealthProfileWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        initialData={myProfile || {}}
        onSave={healthActions.updateProfile}
      />

      {/* MODAL RESET CHU KỲ */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 p-6 rounded-[28px] max-w-sm w-full border border-rose-500/30 text-center">
            <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mb-3 mx-auto border border-rose-500/30">
              <Frown size={28} className="text-rose-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Khởi tạo lại chu kỳ?</h3>
            <p className="text-zinc-400 text-xs font-medium mb-5 leading-relaxed">
              Dữ liệu chu kỳ và các triệu chứng sẽ được xóa để bạn thiết lập lại từ đầu.
            </p>
            <div className="flex gap-2.5">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  cycleActions.resetAllCycles();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/20"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
