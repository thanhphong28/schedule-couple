// components/tabs/Tab1Today.jsx
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { CATEGORIES, DAYS, DAYS_SHORT_EN, PERSONS } from '../../data/initialTasks.js';
import { getDayIndex } from '../../lib/utils.js';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

// Timeline configs
const START_HOUR = 6; // Used for default fallback in parseTimeRange

function timeToNum(t) {
  if (!t) return 0;
  const startStr = t.split('-')[0].trim();
  const [h, m] = startStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function parseTimeRange(t) {
  if (!t) return { start: START_HOUR, end: START_HOUR + 0.5 };
  const parts = t.split('-');
  const startStr = parts[0].trim();
  const startParts = startStr.split(':').map(Number);
  const sh = startParts[0] || 0;
  const sm = startParts[1] || 0;
  const startDec = sh + sm / 60;
  
  let endDec = startDec + 0.5; // Default 30 mins
  if (parts.length > 1 && parts[1].trim() !== '') {
    const endParts = parts[1].trim().split(':').map(Number);
    const eh = endParts[0] || 0;
    const em = endParts[1] || 0;
    if (eh > 0 || em > 0) {
      endDec = eh + em / 60;
    }
  }
  if (endDec <= startDec) endDec = startDec + 0.5;
  return { start: startDec, end: endDec };
}

function getLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1];
}

export default function Tab1Today() {
  const { tasks } = useApp();
  const { user, partner } = useAuth();
  
  // Resolve female and male names
  const femaleUser = user?.gender === 'FEMALE' ? user : (partner?.gender === 'FEMALE' ? partner : null);
  const maleUser = user?.gender === 'MALE' ? user : (partner?.gender === 'MALE' ? partner : null);
  const femaleName = femaleUser?.full_name || femaleUser?.display_name || 'Bạn Nữ';
  const maleName = maleUser?.full_name || maleUser?.display_name || 'Bạn Nam';

  const todayIdx = getDayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'list'
  const [personFilter, setPersonFilter] = useState('ALL'); // 'ALL' | 'FEMALE' | 'MALE'
  const [editTask, setEditTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTimeDec, setCurrentTimeDec] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  // Keep current time updated every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeDec(now.getHours() + now.getMinutes() / 60);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks for the selected day
  const dayTasks = useMemo(() => {
    return tasks
      .filter(t => t.day === selectedDay)
      .sort((a, b) => timeToNum(a.time) - timeToNum(b.time));
  }, [tasks, selectedDay]);

  // Apply person filter
  const filteredDayTasks = useMemo(() => {
    if (personFilter === 'ALL') return dayTasks;
    return dayTasks.filter(t => t.person === personFilter || t.person === 'BOTH');
  }, [dayTasks, personFilter]);

  const completed = filteredDayTasks.filter(t => t.is_completed).length;
  const total = filteredDayTasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Counts per day for day selector pills
  const taskCountsByDay = useMemo(() => {
    const counts = Array(7).fill(0);
    tasks.forEach(t => {
      if (t.day >= 0 && t.day < 7) counts[t.day]++;
    });
    return counts;
  }, [tasks]);

  const handlePrevDay = () => setSelectedDay(prev => Math.max(0, prev - 1));
  const handleNextDay = () => setSelectedDay(prev => Math.min(6, prev + 1));

  // Touch swipe support on timetable card
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const [swipeAnim, setSwipeAnim] = useState('');

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };
  const handleTouchEnd = () => {
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    
    // Require a longer swipe (100px) and ensure horizontal movement is much greater than vertical
    if (Math.abs(diffX) > 100 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && selectedDay < 6) {
        setSwipeAnim('translate-x-[-15px] opacity-0'); // animate out
        setTimeout(() => {
          setSelectedDay(prev => prev + 1); // Swipe left -> Next day
          setSwipeAnim('translate-x-[15px] opacity-0 transition-none'); // snap to right
          setTimeout(() => setSwipeAnim('translate-x-0 opacity-100 transition-all duration-300'), 20); // animate in
        }, 150);
      } else if (diffX < 0 && selectedDay > 0) {
        setSwipeAnim('translate-x-[15px] opacity-0'); // animate out
        setTimeout(() => {
          setSelectedDay(prev => prev - 1); // Swipe right -> Prev day
          setSwipeAnim('translate-x-[-15px] opacity-0 transition-none'); // snap to left
          setTimeout(() => setSwipeAnim('translate-x-0 opacity-100 transition-all duration-300'), 20); // animate in
        }, 150);
      }
    }
  };

  const isToday = selectedDay === todayIdx;

  return (
    <div className="px-3 sm:px-4 py-2 space-y-4 animate-fadeInUp">
      
      {/* ─── DAY SELECTOR STRIP ─── */}
      <section className="glass-panel p-2 rounded-[24px] shadow-lg">
        {/* Navigation & Header Controls */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>📅</span>
              <span>{DAYS[selectedDay]}</span>
            </span>
            {isToday ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-500/35 animate-pulse-subtle">
                Hôm nay ✨
              </span>
            ) : (
              <button 
                type="button"
                onClick={() => setSelectedDay(todayIdx)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-300 bg-white/10 hover:bg-white/15 border border-white/15 transition-all active:scale-95"
              >
                Về hôm nay
              </button>
            )}
          </div>

          {/* Prev / Next Chevrons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={selectedDay === 0}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
              aria-label="Ngày trước"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDay === 6}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
              aria-label="Ngày sau"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* 7 Day Pills */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS_SHORT_EN.map((shortName, idx) => {
            const isSelected = selectedDay === idx;
            const isDayToday = todayIdx === idx;
            const count = taskCountsByDay[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDay(idx)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white font-extrabold shadow-[0_4px_16px_rgba(244,63,94,0.45)] border border-rose-400'
                    : isDayToday
                    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-200'
                }`}
              >
                <span className="text-[11px] font-bold">{shortName}</span>
                <div className="flex items-center gap-0.5 mt-1">
                  {count > 0 ? (
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {count}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── SUMMARY STATS & VIEW TOGGLE ─── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
           <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>🎯</span> Hôm nay
           </h2>
           {viewMode === 'timeline' && (
             <button
               type="button"
               onClick={() => { setEditTask(null); setShowModal(true); }}
               className="p-1.5 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors shadow-sm"
               aria-label="Thêm việc vào lịch"
             >
               <Plus size={14} strokeWidth={3} />
             </button>
           )}
        </div>

        {/* View Switcher: Timeline vs List */}
        <div className="p-1 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock size={14} />
            <span>Lịch</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Việc ({dayTasks.length})</span>
          </button>
        </div>
      </div>


      {/* ─── VIEW 1: TIMELINE (Visual Daily Schedule) ─── */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
        <section 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`glass-panel rounded-[28px] overflow-hidden border border-white/10 shadow-2xl relative transition-all duration-150 ease-out ${swipeAnim}`}
        >
          {/* Header of Timeline: Column headers */}
          <div className="grid border-b border-white/10 bg-zinc-950/60 sticky top-0 z-30 backdrop-blur-xl" style={{ gridTemplateColumns: '50px 1fr 1fr' }}>
            <div className="text-center py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-r border-white/10 flex items-center justify-center">
              Giờ
            </div>
            <div className="py-2 px-1 text-center text-xs font-black uppercase tracking-wider text-pink-300 bg-pink-500/10 border-r border-white/10 flex items-center justify-center gap-1">
              <span className="flex-shrink-0">👧</span>
              <span className="truncate">{getLastName(femaleName)}</span>
            </div>
            <div className="py-2 px-1 text-center text-xs font-black uppercase tracking-wider text-sky-300 bg-sky-500/10 flex items-center justify-center gap-1">
              <span className="flex-shrink-0">👦</span>
              <span className="truncate">{getLastName(maleName)}</span>
            </div>
          </div>

          {/* Timeline Scroll Area */}
          <div className="relative overflow-y-auto max-h-[65dvh] scrollbar-none pb-4">
            {(() => {
              if (dayTasks.length === 0) {
                return (
                  <div className="py-12 text-center text-zinc-400 text-sm">
                    Không có công việc nào trong ngày
                  </div>
                );
              }

              // 1. Get all unique time points from tasks
              const timePoints = new Set();
              dayTasks.forEach(t => {
                const { start, end } = parseTimeRange(t.time);
                timePoints.add(start);
                timePoints.add(end);
              });
              
              const times = Array.from(timePoints).sort((a, b) => a - b);
              
              // 2. Create segments (rows)
              const segments = [];
              for (let i = 0; i < times.length - 1; i++) {
                segments.push({ start: times[i], end: times[i+1] });
              }

              const formatTimeDec = (dec) => {
                const h = Math.floor(dec);
                const m = Math.round((dec - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              };

              return (
                <div 
                  className="grid relative" 
                  style={{
                    gridTemplateColumns: '50px 1fr 1fr',
                    gridAutoRows: 'minmax(50px, auto)'
                  }}
                >
                  {/* Vertical dividers */}
                  <div className="absolute top-0 bottom-0 left-[50px] border-r border-white/10 z-0" />
                  <div className="absolute top-0 bottom-0 left-[calc(50px+(100%-50px)/2)] border-r border-dashed border-white/10 z-0" />

                  {/* Render Segments for Time Labels and Grid Lines */}
                  {segments.map((seg, idx) => {
                    const isCurrent = isToday && currentTimeDec >= seg.start && currentTimeDec < seg.end;
                    return (
                      <div 
                        key={`seg-${idx}`} 
                        className="relative border-b border-white/5 z-0" 
                        style={{ gridColumn: '1 / 4', gridRow: idx + 1 }}
                      >
                        {/* Time Label */}
                        <div className="absolute left-0 top-0 w-[50px] h-full">
                           <div className="absolute top-0 right-1.5 -translate-y-1/2 text-[10px] font-bold text-zinc-400 bg-zinc-950/80 px-1 rounded shadow-sm">
                             {formatTimeDec(seg.start)}
                           </div>
                           {isCurrent && (
                             <div className="absolute top-0 right-0 w-full h-full border-r-2 border-rose-500/40 bg-rose-500/5 pointer-events-none" />
                           )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Last Time Label at the very bottom */}
                  {segments.length > 0 && (
                    <div 
                      className="relative z-0" 
                      style={{ gridColumn: '1 / 4', gridRow: segments.length }}
                    >
                       <div className="absolute left-0 bottom-0 w-[50px]">
                         <div className="absolute bottom-0 right-1.5 translate-y-1/2 text-[10px] font-bold text-zinc-400 bg-zinc-950/80 px-1 rounded shadow-sm">
                           {formatTimeDec(segments[segments.length - 1].end)}
                         </div>
                       </div>
                    </div>
                  )}

                  {/* Render Tasks */}
                  {dayTasks.map(t => {
                    const { start, end } = parseTimeRange(t.time);
                    const startIndex = times.indexOf(start);
                    let endIndex = times.indexOf(end);
                    if (endIndex <= startIndex) endIndex = startIndex + 1;

                    const gridRow = `${startIndex + 1} / ${endIndex + 1}`;
                    
                    let gridColumn;
                    if (t.person === 'FEMALE') gridColumn = '2 / 3';
                    else if (t.person === 'MALE') gridColumn = '3 / 4';
                    else gridColumn = '2 / 4';

                    const catColor = CATEGORIES[t.category]?.color || '#F43F5E';

                    return (
                      <div
                        key={t.id}
                        onClick={() => { setEditTask(t); setShowModal(true); }}
                        className="p-1 z-10 cursor-pointer transition-transform active:scale-[0.98]"
                        style={{ gridRow, gridColumn }}
                      >
                        <div 
                          className={`w-full h-full rounded-xl p-2 flex flex-col justify-start relative overflow-hidden border backdrop-blur-md transition-all ${
                            t.is_completed 
                              ? 'bg-zinc-950/70 border-white/5 opacity-60' 
                              : 'bg-zinc-900/85 border-white/15 hover:border-white/30 shadow-md'
                          }`}
                        >
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                            style={{ backgroundColor: t.is_completed ? '#52525b' : catColor }}
                          />

                          <div className="pl-1.5 min-w-0 flex flex-col h-full justify-start">
                            {t.time && (
                              <div className="text-[10px] font-bold text-rose-300 leading-tight mb-0.5 opacity-90">
                                {t.time}
                              </div>
                            )}
                            <div className={`text-[11px] font-bold leading-snug break-words whitespace-normal ${
                              t.is_completed ? 'line-through text-zinc-400 font-medium' : 'text-white'
                            }`}>
                              {t.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Quick swipe hint footer */}
          <div className="py-2 px-3 bg-zinc-950/70 border-t border-white/10 flex items-center justify-center text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span>↔</span> Vuốt để đổi ngày trong tuần
            </span>
          </div>
        </section>
        </div>
      )}

      {/* ─── VIEW 2: TASK LIST FOCUS ─── */}
      {viewMode === 'list' && (
        <section className="space-y-4 animate-fadeIn">
          {/* Smart Task Dashboard Filter */}
          <div className="glass-panel p-3 sm:p-4 rounded-[28px] border border-white/10 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white mb-0.5 flex items-center gap-1.5">
                  Checklist <span className="text-zinc-500">({total})</span>
                </h3>
                <div className="text-[11px] font-medium text-zinc-400">
                  <span className="text-emerald-400 font-bold">{completed}</span> đã xong • <span className="text-rose-400 font-bold">{total - completed}</span> còn lại
                </div>
              </div>
            </div>

            {/* Segmented Control for Filtering */}
            <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
              <button 
                onClick={() => setPersonFilter('ALL')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${personFilter === 'ALL' ? 'bg-white/20 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Tất cả</span>
                <span className="text-lg">👥</span>
              </button>
              <button 
                onClick={() => setPersonFilter('FEMALE')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${personFilter === 'FEMALE' ? 'bg-pink-500/20 text-pink-300 shadow-sm border border-pink-500/30' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full px-1">{getLastName(femaleName)}</span>
                <span className="text-lg">👧</span>
              </button>
              <button 
                onClick={() => setPersonFilter('MALE')}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${personFilter === 'MALE' ? 'bg-sky-500/20 text-sky-300 shadow-sm border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate max-w-full px-1">{getLastName(maleName)}</span>
                <span className="text-lg">👦</span>
              </button>
            </div>
          </div>

          {/* Task List Rendering */}
          {filteredDayTasks.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center border-white/10 mt-4 shadow-lg">
              <div className="text-4xl mb-3 animate-bounce-subtle">
                {personFilter === 'FEMALE' ? '👧' : personFilter === 'MALE' ? '👦' : '🌸'}
              </div>
              <p className="text-sm font-bold text-zinc-200">
                {personFilter === 'FEMALE' ? `${femaleName} chưa có việc cần làm` : 
                 personFilter === 'MALE' ? `${maleName} chưa có việc cần làm` : 
                 'Không có công việc nào cho ngày này'}
              </p>
              <p className="text-xs text-zinc-400 mt-1.5">Tận hưởng thời gian nghỉ ngơi nhé!</p>
            </div>
          ) : (
            <div className="space-y-2.5 pb-20">
              {filteredDayTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── TASK MODAL / BOTTOM SHEET ─── */}
      {showModal && (
        <TaskModal
          task={editTask ? editTask : { day: selectedDay }}
          onClose={() => { setShowModal(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}
