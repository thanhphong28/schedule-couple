// components/tabs/Tab1Today.jsx
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { CATEGORIES, DAYS, DAYS_SHORT_EN, PERSONS } from '../../data/initialTasks.js';
import { getDayIndex } from '../../lib/utils.js';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

// Timeline configs
const START_HOUR = 6; // 06:00
const END_HOUR = 24; // 24:00
const PIXELS_PER_HOUR = 64; // 1 hour = 64px
const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * PIXELS_PER_HOUR;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

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

export default function Tab1Today() {
  const { tasks } = useApp();
  const { user, partner } = useAuth();
  
  // Resolve female and male names
  const femaleUser = user?.gender === 'FEMALE' ? user : (partner?.gender === 'FEMALE' ? partner : null);
  const maleUser = user?.gender === 'MALE' ? user : (partner?.gender === 'MALE' ? partner : null);
  const femaleName = femaleUser?.display_name || 'Bạn Nữ';
  const maleName = maleUser?.display_name || 'Bạn Nam';

  const todayIdx = getDayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'list'
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

  const completed = dayTasks.filter(t => t.is_completed).length;
  const total = dayTasks.length;
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
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 55) {
      if (diff > 0 && selectedDay < 6) {
        setSelectedDay(prev => prev + 1); // Swipe left -> Next day
      } else if (diff < 0 && selectedDay > 0) {
        setSelectedDay(prev => prev - 1); // Swipe right -> Prev day
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
        {/* Progress Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-xs font-bold text-zinc-200">
            <CheckCircle2 size={13} className={pct === 100 ? 'text-emerald-400' : 'text-rose-400'} />
            <span>{completed}/{total} việc</span>
            <span className="text-zinc-500">•</span>
            <span className={pct === 100 ? 'text-emerald-400 font-black' : 'text-rose-300 font-black'}>{pct}%</span>
          </div>
        </div>

        {/* View Switcher: Timeline vs List */}
        <div className="p-1 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock size={12} />
            <span>Lịch</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar size={12} />
            <span>Việc</span>
          </button>
        </div>
      </div>

      {/* ─── VIEW 1: TIMELINE (Visual Daily Schedule) ─── */}
      {viewMode === 'timeline' && (
        <section 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="glass-panel rounded-[28px] overflow-hidden border border-white/10 shadow-2xl relative"
        >
          {/* Header of Timeline: Column headers */}
          <div className="flex border-b border-white/10 bg-zinc-950/60 sticky top-0 z-20 backdrop-blur-xl">
            {/* Time label column space */}
            <div className="w-[50px] flex-shrink-0 text-center py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-r border-white/10">
              Giờ
            </div>
            {/* Female Column */}
            <div className="flex-1 py-2 text-center text-xs font-black uppercase tracking-wider text-pink-300 bg-pink-500/10 border-r border-white/10 flex items-center justify-center gap-1.5">
              <span>👧</span> {femaleName}
            </div>
            {/* Male Column */}
            <div className="flex-1 py-2 text-center text-xs font-black uppercase tracking-wider text-sky-300 bg-sky-500/10 flex items-center justify-center gap-1.5">
              <span>👦</span> {maleName}
            </div>
          </div>

          {/* Timeline Scroll Area */}
          <div className="relative flex overflow-y-auto max-h-[65dvh] scrollbar-none" style={{ height: TIMELINE_HEIGHT }}>
            {/* Left: Time Ruler */}
            <div className="w-[50px] flex-shrink-0 bg-zinc-950/50 border-r border-white/10 relative z-10 select-none">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="absolute w-full text-right pr-2 text-[11px] font-bold text-zinc-400"
                  style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR + 2 }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Right: Schedule Canvas */}
            <div className="flex-1 relative">
              {/* Horizontal Hour Grid Lines */}
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="absolute w-full border-t border-white/5"
                  style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR }}
                />
              ))}

              {/* Vertical Column Divider (Between Thi & Phong) */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px border-r border-dashed border-white/10 pointer-events-none" />

              {/* Live Current Time Line (if today) */}
              {isToday && currentTimeDec >= START_HOUR && currentTimeDec <= END_HOUR && (
                <div 
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: (currentTimeDec - START_HOUR) * PIXELS_PER_HOUR }}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] -ml-1" />
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                  <span className="text-[9px] font-black px-1 rounded bg-rose-500 text-white mr-1 shadow-sm">
                    Hiện tại
                  </span>
                </div>
              )}

              {/* Render Tasks on Timeline */}
              {dayTasks.map(t => {
                const { start, end } = parseTimeRange(t.time);
                const safeStart = Math.max(START_HOUR, start);
                const safeEnd = Math.min(END_HOUR, Math.max(safeStart + 0.35, end));
                
                const top = (safeStart - START_HOUR) * PIXELS_PER_HOUR;
                const height = Math.max(34, (safeEnd - safeStart) * PIXELS_PER_HOUR);

                // Column placement
                let left = '0%';
                let width = '100%';
                if (t.person === 'FEMALE') {
                  width = '50%';
                } else if (t.person === 'MALE') {
                  left = '50%';
                  width = '50%';
                }

                const catColor = CATEGORIES[t.category]?.color || '#F43F5E';

                return (
                  <div
                    key={t.id}
                    onClick={() => { setEditTask(t); setShowModal(true); }}
                    className="absolute z-10 p-0.5 cursor-pointer select-none transition-transform active:scale-[0.98]"
                    style={{ top, height, left, width }}
                  >
                    <div 
                      className={`w-full h-full rounded-xl p-1.5 flex flex-col justify-start relative overflow-hidden border backdrop-blur-md transition-all ${
                        t.is_completed 
                          ? 'bg-zinc-950/70 border-white/5 opacity-60' 
                          : 'bg-zinc-900/85 border-white/15 hover:border-white/30 shadow-md'
                      }`}
                    >
                      {/* Left Category Indicator */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ backgroundColor: t.is_completed ? '#52525b' : catColor }}
                      />

                      <div className="pl-1.5 min-w-0">
                        {t.time && (
                          <div className="text-[10px] font-bold text-rose-300 leading-tight truncate">
                            {t.time}
                          </div>
                        )}
                        <div className={`text-xs font-bold leading-tight truncate mt-0.5 ${
                          t.is_completed ? 'line-through text-zinc-400 font-medium' : 'text-white'
                        }`}>
                          {t.is_completed ? '✓ ' : ''}{t.title}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick swipe hint footer */}
          <div className="py-2 px-3 bg-zinc-950/70 border-t border-white/10 flex items-center justify-center text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span>↔</span> Vuốt để đổi ngày trong tuần
            </span>
          </div>
        </section>
      )}

      {/* ─── VIEW 2: TASK LIST FOCUS ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>🎯</span>
            <span>Việc cần làm ({dayTasks.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => { setEditTask(null); setShowModal(true); }}
            className="btn-primary text-xs py-1.5 px-3 rounded-xl"
          >
            <Plus size={14} /> Thêm việc
          </button>
        </div>

        {dayTasks.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center border-white/10">
            <div className="text-4xl mb-2">🌸</div>
            <p className="text-sm font-bold text-zinc-200">Không có công việc nào cho ngày này</p>
            <p className="text-xs text-zinc-400 mt-1">Hãy tận hưởng thời gian nghỉ ngơi hoặc lên kế hoạch mới!</p>
            <button
              type="button"
              className="btn-primary mt-4 text-xs py-2 px-4 shadow-lg shadow-rose-500/20"
              onClick={() => { setEditTask(null); setShowModal(true); }}
            >
              + Thêm việc cho {DAYS[selectedDay]}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => { setEditTask(t); setShowModal(true); }}
              />
            ))}
          </div>
        )}
      </section>

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
