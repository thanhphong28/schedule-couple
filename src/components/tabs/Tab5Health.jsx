import { useState, useMemo } from 'react';
import { useCycle } from '../../hooks/useCycle.js';
import { HeartPulse, CalendarClock, Droplets, Smile, Frown, Coffee, Info, EyeOff, ShieldCheck, ChevronLeft, ChevronRight, Settings, BarChart2, AlertTriangle, CheckCircle } from 'lucide-react';

// ==========================================
// COMPONENT: ONBOARDING CHO BẠN NỮ
// ==========================================
function Onboarding({ onComplete }) {
  const [lastPeriod, setLastPeriod] = useState(new Date().toISOString().split('T')[0]);
  const [periodLength, setPeriodLength] = useState(5);

  return (
    <div className="glass-panel p-6 rounded-[32px] animate-fade-in mt-10 shadow-[0_8px_30px_rgba(244,63,94,0.1)]">
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
          <input 
            type="date" 
            value={lastPeriod}
            onChange={(e) => setLastPeriod(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-rose-300 mb-1">Kỳ kinh thường kéo dài mấy ngày?</label>
          <input 
            type="number" 
            value={periodLength}
            onChange={(e) => setPeriodLength(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
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
  // Điều chỉnh để T2 là ngày đầu tuần
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const goToMonth = (newDate) => {
    setCurrentDate(newDate);
    // Notify parent of the month key "YYYY-MM"
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
          let textDecoration = "";
          
          if (status?.isExcluded) {
             // Visual cue for explicitly removed date inside a period
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
            bgClass = bgClass.replace('bg-transparent', 'bg-zinc-800'); // Ensure visibility if transparent
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

// ==========================================
// MAPPING TRIỆU CHỨNG
// ==========================================
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
  const { isFemale, isMale, isLoading, getInsightForDate, getCalendarStatus, irregularityWarning, actions, profile, cycles, needsAnalysis, analysisResult } = useCycle();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tempPeriodLength, setTempPeriodLength] = useState(profile?.average_period_length || 5);
  // Track which calendar month the user is currently viewing (for context-aware warnings)
  const [viewingMonthKey, setViewingMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Lấy insight dựa trên ngày đang chọn (thay vì luôn là hôm nay)
  const insight = getInsightForDate ? getInsightForDate(selectedDateStr) : null;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center pt-20 animate-pulse">
        <HeartPulse className="text-rose-400 mb-4" size={40} />
        <p className="text-zinc-400">Đang đồng bộ dữ liệu sức khỏe...</p>
      </div>
    );
  }

  if (isMale && !insight) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="text-zinc-500 mb-4" size={48} />
        <h2 className="text-lg font-bold text-white mb-2">Chờ kết nối</h2>
        <p className="text-zinc-400 text-sm">Hãy kết nối với bạn gái để mở khóa tính năng Couple Care nhé!</p>
      </div>
    );
  }

  // Format ngày dạng m/d
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const handleOnboardingComplete = (lastPeriod, periodLength) => {
    actions.startNewPeriod(lastPeriod, periodLength);
  };

  return (
    <div className="flex-1 flex flex-col space-y-5 px-1 animate-fade-in pb-10">
      {/* HEADER TABS */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <HeartPulse size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Chu Kỳ</h1>
          <p className="text-xs text-rose-300/80 font-medium tracking-wide">
            {isFemale ? 'Theo dõi chu kỳ thông minh' : 'Trợ lý chăm sóc người yêu'}
          </p>
        </div>
      </div>

      {/* INJECT DISCLAIMER */}
      {showDisclaimer && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 leading-relaxed relative">
          <button onClick={() => setShowDisclaimer(false)} className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white">✕</button>
          <strong className="text-white block mb-1">Cảnh báo Y khoa (Disclaimer):</strong>
          Thông tin và dự đoán trên ứng dụng dựa trên các nghiên cứu y khoa (ACOG, WHO, NHS) và lịch sử của bạn. Tuy nhiên, nó chỉ mang tính tham khảo, KHÔNG thay thế chẩn đoán y khoa chuyên môn.
        </div>
      )}

      {/* MODAL IS NO LONGER NEEDED AS ACTION IS DIRECT */}

      {/* DASHBOARD NỮ */}
      {isFemale && (
        <div className="relative">
          {/* Header Actions */}
          <div className="absolute -top-12 right-0 flex gap-2">
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-bold transition-colors border border-transparent hover:border-rose-500/30 flex items-center gap-1"
            >
              <Settings size={14} /> Khởi tạo lại
            </button>
          </div>
          
          {cycles.length === 0 ? (
            <Onboarding onComplete={handleOnboardingComplete} />
          ) : (
            <>
              {/* COMPONENT LỊCH (CALENDAR) */}
              <HealthCalendar 
                cycles={cycles}
                getInsightForDate={getInsightForDate}
                getCalendarStatus={getCalendarStatus}
                selectedDateStr={selectedDateStr}
                onSelectDate={setSelectedDateStr}
                onMonthChange={setViewingMonthKey}
              />

               <div className="flex justify-between items-center px-1">
                 <div>
                   <h2 className="text-sm font-bold text-white">
                     {selectedDateStr === new Date().toISOString().split('T')[0] ? 'Hôm nay' : formatDate(selectedDateStr)}
                   </h2>
                   <p className="text-xs text-zinc-400">Ngày thứ {insight?.cycleDay > 0 ? insight?.cycleDay : '--'} của chu kỳ</p>
                 </div>
                 
                 <div className="flex gap-2">
                   {insight?.isConfirmedPeriod ? (
                     <button 
                       onClick={() => actions.togglePeriodDay(selectedDateStr)}
                       className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-rose-500 border border-rose-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
                     >
                       - Xóa ngày
                     </button>
                   ) : (
                     <button 
                       onClick={() => actions.togglePeriodDay(selectedDateStr)}
                       className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-500/20 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                     >
                       + Kinh nguyệt
                     </button>
                   )}
                 </div>
              </div>

              {/* PHÂN TÍCH CHU KỲ (Dựa trên 3 chu kỳ gần nhất) */}
              <div className="glass-panel p-5 rounded-3xl mt-4 mb-4 border border-rose-500/20 shadow-[0_8px_30px_rgba(244,63,94,0.05)]">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart2 size={16} className="text-rose-400"/> Phân tích chu kỳ
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-zinc-900/50 p-3 rounded-2xl flex flex-col justify-center items-center text-center border border-zinc-800/50">
                    <span className="text-xl font-black text-white">{profile?.average_cycle_length || 28}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Vòng kinh (ngày)</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 rounded-2xl flex flex-col justify-center items-center text-center border border-zinc-800/50">
                    <span className="text-xl font-black text-rose-400">{profile?.average_period_length || 5}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Hành kinh (ngày)</span>
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
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">Cần ghi nhận ít nhất 3 chu kỳ để hệ thống đánh giá mức độ đều đặn.</p>
                  </div>
                )}
                
                {cycles.length >= 1 && (
                  <button 
                    onClick={() => needsAnalysis && actions.forceAnalyzeCycles()}
                    disabled={!needsAnalysis}
                    className={`w-full mt-3 py-2.5 text-[12px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                      needsAnalysis
                        ? 'bg-gradient-to-r from-rose-600/80 to-pink-600/80 hover:from-rose-500 hover:to-pink-500 text-white border-rose-500/40 shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer'
                        : 'bg-zinc-900/60 text-zinc-600 border-zinc-800/50 cursor-not-allowed'
                    }`}
                  >
                    {needsAnalysis ? '🔍 Bắt đầu phân tích & Cập nhật lịch' : '✔️ Đã phân tích — Chỉnh sửa thêm để phân tích lại'}
                  </button>
                )}

                {/* WARNINGS FROM LAST ANALYSIS — filtered to the month being viewed */}
                {(() => {
                  const monthWarnings = (analysisResult?.warnings || []).filter(w =>
                    // 'hormonal' warnings have a month key embedded in the message
                    // Others (cycle variability) always show
                    !w.monthKey || w.monthKey === viewingMonthKey
                  );
                  if (monthWarnings.length === 0) return null;
                  return (
                    <div className="mt-3 space-y-2">
                      {monthWarnings.map((w, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${
                          w.severity === 'high'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-amber-500/10 border-amber-500/25'
                        }`}>
                          <div className={`text-[11px] font-bold mb-1.5 ${ w.severity === 'high' ? 'text-red-300' : 'text-amber-300'}`}>
                            {w.severity === 'high' ? '⚠️' : 'ℹ️'} {w.message}
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">{w.advice}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* LỜI KHUYÊN Y KHOA DÀNH CHO NỮ */}
              {insight?.evidence && (
                <div className="glass-panel p-5 rounded-3xl border-l-4 border-rose-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                      Giai đoạn: {insight.evidence.name}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed mb-4">
                    {insight.evidence.female_insight}
                  </p>
                  
                  {/* Từng Recommendation */}
                  <div className="space-y-3">
                    {insight.evidence.recommendations?.map((rec) => (
                      <div key={rec.id} className="bg-zinc-900/50 rounded-2xl p-3 border border-zinc-800/50">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-bold text-rose-300">{rec.title}</h4>
                          <button onClick={() => setShowDisclaimer(true)} className="text-zinc-500 hover:text-white"><Info size={14}/></button>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mb-1">
                          {rec.content}
                        </p>
                        <div className="text-[9px] text-zinc-600 font-medium italic">
                          Nguồn: {rec.source_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SYMPTOM TRACKING */}
              <div className="glass-panel p-5 rounded-3xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Smile size={16} className="text-amber-400"/> Bạn cảm thấy thế nào?
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {SYMPTOM_OPTIONS.map(symp => {
                    const isSelected = insight?.symptomsToday?.some(s => s.symptom_type === symp.id);
                    return (
                      <button 
                        key={symp.id}
                        onClick={() => actions.logSymptom(selectedDateStr, symp.id, 'moderate')}
                        className={`py-2.5 px-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all border ${
                          isSelected 
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' 
                            : 'bg-zinc-800/50 hover:bg-zinc-700/50 border-transparent hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span className="text-xl">{symp.icon}</span>
                        <span className="text-[10px] font-medium">{symp.label}</span>
                      </button>
                    )
                  })}
                </div>
                
              </div>
            </>
          )}
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 p-6 rounded-[28px] max-w-sm w-full border border-rose-500/30 shadow-[0_20px_60px_rgba(244,63,94,0.15)] flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/30">
              <Frown size={32} className="text-rose-400" />
            </div>
            
            <h3 className="text-xl font-black text-white mb-2">Khởi tạo lại?</h3>
            <p className="text-zinc-400 text-sm font-medium mb-6">
              Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử chu kỳ và các triệu chứng không? Dữ liệu này không thể khôi phục lại được đâu nhé!
            </p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  actions.resetAllCycles();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-500/20 text-white font-bold rounded-xl transition-all"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {isMale && (
        <>
              {/* LỊCH VIEW CHO NAM */}
              <HealthCalendar 
                cycles={cycles}
                getInsightForDate={getInsightForDate}
                getCalendarStatus={getCalendarStatus}
                selectedDateStr={selectedDateStr}
                onSelectDate={setSelectedDateStr}
              />

              {/* STATUS CARD */}
              <div className="glass-panel p-6 rounded-[32px] flex flex-col relative overflow-hidden border border-rose-500/20 shadow-[0_8px_30px_rgba(244,63,94,0.1)]">
                <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-pink-500/10 blur-3xl rounded-full" />
                
                <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-1">
                  {selectedDateStr === new Date().toISOString().split('T')[0] ? 'Hôm nay' : `Ngày ${formatDate(selectedDateStr)}`}
                </p>
                <h2 className="text-2xl font-black text-white mb-2 leading-tight">Ngày thứ {insight?.cycleDay > 0 ? insight?.cycleDay : '--'} của chu kỳ</h2>
                
                {insight?.evidence && (
                  <div className="inline-block mt-1 mb-2">
                    <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold uppercase">
                      Giai đoạn: {insight.evidence.name}
                    </span>
                  </div>
                )}
                
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  {insight?.evidence?.male_insight || 'Chưa có thông tin. Hãy nhắc cô ấy cập nhật lịch nhé!'}
                </p>
              </div>

              {/* LỜI KHUYÊN Y KHOA: CẢNH BÁO CHO NAM */}
              {insight?.evidence?.couple_care_tips && (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-md mt-2">
                  <h3 className="text-sm font-bold text-amber-300 mb-4 flex items-center gap-2">
                    <Coffee size={16} /> Gợi ý hành động hôm nay
                  </h3>
                  <ul className="space-y-4">
                    {insight.evidence.couple_care_tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 flex flex-shrink-0 items-center justify-center text-[10px] font-black mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed pt-0.5">{tip}</p>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Nút Why am I seeing this? */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/50">
                    <button onClick={() => setShowDisclaimer(true)} className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                      <Info size={12}/> Cơ sở khoa học của những lời khuyên này?
                    </button>
                  </div>
                </div>
              )}

              {/* SYMPTOMS LOGGED */}
              <div className="glass-panel p-5 rounded-3xl mt-4 border-dashed border-rose-500/30">
                <h3 className="text-xs font-bold text-rose-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Smile size={14} /> Trạng thái của cô ấy hôm nay
                </h3>
                {insight?.symptomsToday?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {insight.symptomsToday.map(s => {
                      const sympConfig = SYMPTOM_OPTIONS.find(opt => opt.id === s.symptom_type) || { icon: '•', label: s.symptom_type };
                      return (
                        <span key={s.id} className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-200 font-medium shadow-sm flex items-center gap-1">
                          {sympConfig.icon} {sympConfig.label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 font-medium italic">
                    Hôm nay cô ấy chưa ghi nhận cảm xúc hay triệu chứng nào.
                  </p>
                )}
              </div>
        </>
      )}
    </div>
  );
}
