// components/tabs/Tab1Today.jsx
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS, DAYS_EN, DAYS_SHORT_EN } from '../../data/initialTasks.js';
import { getDayIndex } from '../../lib/utils.js';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

// Timeline configs
const START_HOUR = 6; // 06:00
const END_HOUR = 24; // 24:00
const PIXELS_PER_HOUR = 65; // 1 hour = 65px
const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * PIXELS_PER_HOUR;

// Generate hourly labels
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToNum(t) {
  if (!t) return 0;
  const startStr = t.split('-')[0].trim();
  const [h, m] = startStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function parseTimeRange(t) {
  if (!t) return { start: START_HOUR, end: START_HOUR + 0.5 };
  const parts = t.split('-');
  const startStr = parts[0].trim();
  const startParts = startStr.split(':').map(Number);
  const sh = startParts[0] || 0;
  const sm = startParts[1] || 0;
  const startDec = sh + sm / 60;
  
  let endDec = startDec + 0.5; // Default 30 mins if no end time
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

function TimetableDay({ dayIdx, tasks, onSelectTask }) {
  const dayTasks = tasks.filter(t => t.day === dayIdx);

  return (
    <div className="relative w-full" style={{ height: TIMELINE_HEIGHT }}>
      {/* Background Grid Lines */}
      {HOURS.map(hour => (
        <div 
          key={hour} 
          className="absolute w-full border-t border-white/5"
          style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR, height: PIXELS_PER_HOUR }}
        />
      ))}
      
      {/* Column Dividers */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px border-r border-dashed border-white/10 z-0" />

      {/* Render Tasks */}
      {dayTasks.map(t => {
        const { start, end } = parseTimeRange(t.time);
        
        // Ensure bounds
        const safeStart = Math.max(START_HOUR, start);
        const safeEnd = Math.min(END_HOUR, Math.max(safeStart + 0.25, end));
        
        const top = (safeStart - START_HOUR) * PIXELS_PER_HOUR;
        const height = (safeEnd - safeStart) * PIXELS_PER_HOUR;
        
        // Determine columns
        let left = '0%';
        let width = '100%';
        if (t.person === 'THI') {
          width = '50%';
        } else if (t.person === 'PHONG') {
          left = '50%';
          width = '50%';
        }
        
        // Very short tasks might need minimum height for text
        const isSmall = height < 35;
        
        return (
          <div
            key={t.id}
            onClick={() => onSelectTask?.(t)}
            className="absolute z-10 transition-transform hover:scale-[1.02] hover:z-30 cursor-pointer flex flex-col"
            style={{ 
              top, 
              height, 
              left, 
              width,
              padding: '2px',
            }}
          >
            <div 
              className="w-full h-full rounded-[14px] flex flex-col relative transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] group overflow-hidden"
              style={{ 
                backgroundColor: t.is_completed ? 'rgba(20, 20, 25, 0.45)' : 'rgba(35, 35, 42, 0.55)',
                backdropFilter: 'blur(20px) saturate(120%)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
              title={t.title + (t.time ? ` (${t.time})` : '')}
            >
              {/* Left Color Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2 rounded-l-[12px]"
                style={{ backgroundColor: t.is_completed ? '#4ade80' : (CATEGORIES[t.category]?.color || '#E27387') }}
              />
              
              <div className="pl-3 pr-2 py-1.5 flex-1 flex flex-col overflow-y-auto scrollbar-none">
                {!isSmall && (
                  <div className="text-[10px] text-pink-200/90 font-bold mb-0.5 tracking-tight whitespace-nowrap flex-shrink-0">
                    {t.time}
                  </div>
                )}
                <div 
                  className={`text-[11px] sm:text-xs font-extrabold leading-snug pb-0.5 ${t.is_completed ? 'text-white/40 line-through' : 'text-white'}`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {t.is_completed && '✅ '}
                  {t.title}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Tab1Today() {
  const { tasks } = useApp();
  const todayIdx = getDayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [editTask, setEditTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const scrollContainerRef = useRef(null);
  const isProgrammaticScroll = useRef(false);

  // Filter tasks for focus section
  const dayTasks = tasks
    .filter(t => t.day === selectedDay)
    .sort((a, b) => timeToNum(a.time) - timeToNum(b.time));

  const completed = dayTasks.filter(t => t.is_completed).length;
  const pct = dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0;

  // Scroll to a specific day column
  const scrollToDay = (di, behavior = 'smooth') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const dayWidth = container.clientWidth;
    if (dayWidth > 0) {
      isProgrammaticScroll.current = true;
      setSelectedDay(di);
      container.scrollTo({ left: di * dayWidth, behavior });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 350);
    }
  };

  const selectedDayRef = useRef(selectedDay);
  selectedDayRef.current = selectedDay;
  const hasMountedRef = useRef(false);

  // On mount: smoothly auto-align to today ONCE only
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      const timer = setTimeout(() => {
        scrollToDay(todayIdx, 'auto');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [todayIdx]);

  // Window resize: maintain current day position
  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const dayWidth = container.clientWidth;
        container.scrollTo({ left: selectedDayRef.current * dayWidth, behavior: 'auto' });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track swiping gestures to update the active day
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const dayWidth = container.clientWidth;
    if (dayWidth > 50) {
      const scrollPos = container.scrollLeft;
      const activeIdx = Math.round(scrollPos / dayWidth);
      const clamped = Math.max(0, Math.min(6, activeIdx));
      if (clamped !== selectedDay) {
        setSelectedDay(clamped);
      }
    }
  };

  const goToPrevDay = () => {
    const prev = Math.max(0, selectedDay - 1);
    scrollToDay(prev, 'smooth');
  };

  const goToNextDay = () => {
    const next = Math.min(6, selectedDay + 1);
    scrollToDay(next, 'smooth');
  };

  return (
    <div className="px-3 sm:px-5 py-4 space-y-6 animate-fadeInUp">
      {/* TIMETABLE OVERVIEW */}
      <section>
        {/* Navigation Bar for Timetable */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-white drop-shadow-sm uppercase tracking-wide">
              📅 Thời khóa biểu
            </span>
            <span className="badge liquid-glass border-white/40 text-pink-100 px-2.5 py-0.5 text-xs shadow-sm font-bold">
              {DAYS_SHORT_EN[selectedDay]} • {DAYS[selectedDay]}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={goToPrevDay}
              disabled={selectedDay === 0}
              className="p-2 rounded-xl liquid-glass border border-white/20 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-sm"
              aria-label="Ngày trước"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => scrollToDay(todayIdx, 'smooth')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all active:scale-95 shadow-sm border ${
                selectedDay === todayIdx
                  ? 'bg-pink-500 text-white border-pink-400'
                  : 'liquid-glass border-white/30 text-pink-200 hover:bg-white/10'
              }`}
            >
              Hôm nay ✨
            </button>
            <button 
              onClick={goToNextDay}
              disabled={selectedDay === 6}
              className="p-2 rounded-xl liquid-glass border border-white/20 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-sm"
              aria-label="Ngày tiếp theo"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Day Quick Selector Pills */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-none pb-1">
          {DAYS_SHORT_EN.map((shortName, idx) => (
            <button
              key={idx}
              onClick={() => scrollToDay(idx, 'smooth')}
              className={`flex-1 min-w-[42px] py-1.5 px-1 rounded-xl text-xs font-extrabold transition-all border text-center ${
                selectedDay === idx
                  ? 'bg-white/25 text-white border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] scale-105'
                  : idx === todayIdx
                  ? 'bg-pink-500/20 text-pink-200 border-pink-400/40 hover:bg-pink-500/30'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {shortName}
              {idx === todayIdx && <span className="block text-[8px] text-pink-300 leading-none mt-0.5">•</span>}
            </button>
          ))}
        </div>

        {/* Timetable Card: Side-by-side Time Column and Swipeable Days Track */}
        <div className="liquid-glass rounded-[28px] overflow-hidden border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex">
          {/* Left: Stationary Time column */}
          <div 
            className="relative min-w-[50px] sm:min-w-[58px] w-[50px] sm:w-[58px] pr-2 flex-shrink-0 bg-[#1c1c24]/90 backdrop-blur-xl border-r border-white/10 shadow-[4px_0_16px_rgba(0,0,0,0.2)] z-10 pt-2" 
            style={{ height: TIMELINE_HEIGHT + 60 }}
          >
            <div className="h-12 mb-2 flex items-center justify-end pr-2 text-[10px] font-black text-white/60 uppercase tracking-widest">
              Giờ
            </div>
            {HOURS.map(hour => (
              <div 
                key={hour} 
                className="absolute w-full text-right pr-2 text-[11px] font-extrabold text-white/80"
                style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR + 56 + 8 - 7 }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Right: Days Carousel / Swipe Track */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x snap-mandatory scroll-smooth flex relative"
          >
            {DAYS.map((day, di) => (
              <div 
                key={di} 
                data-day-idx={di}
                className="w-full min-w-full flex-shrink-0 px-2 snap-start relative" 
                style={{ height: TIMELINE_HEIGHT + 60 }}
              >
                {/* Header for Day (Day title + Thi & Phong split) */}
                <div className="h-12 mb-2 bg-white/5 rounded-2xl p-1.5 border border-white/10 backdrop-blur-md flex flex-col justify-center">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      {DAYS_EN[di]} <span className="text-white/40">•</span> <span className="text-white/80 font-semibold">{day}</span>
                    </span>
                    {di === todayIdx ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 border border-pink-500/40">
                        Hôm nay ✨
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-white/40 uppercase">
                        Vuốt để đổi ↔
                      </span>
                    )}
                  </div>
                  <div className="flex text-[10px] font-black uppercase tracking-widest text-white/90">
                    <div className="w-1/2 text-center text-pink-300 flex items-center justify-center gap-1">
                      <span>👧</span> Thi
                    </div>
                    <div className="w-1/2 text-center text-sky-300 flex items-center justify-center gap-1">
                      <span>👦</span> Phong
                    </div>
                  </div>
                </div>
                
                {/* Timeline content for this day */}
                <TimetableDay 
                  dayIdx={di} 
                  tasks={tasks} 
                  onSelectTask={(t) => { setEditTask(t); setShowModal(true); }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY FOCUS SECTION */}
      <section>
        <div className="liquid-glass rounded-[28px] overflow-hidden border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          {/* Header */}
          <div className="px-5 py-5 border-b border-white/20 bg-white/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-black text-white drop-shadow-sm uppercase tracking-wide">
                  🎯 Tiêu điểm: {DAYS_EN[selectedDay]} ({DAYS[selectedDay]})
                </h2>
                <p className="text-xs text-white/80 font-bold mt-1 tracking-wide">
                  {dayTasks.length} việc • {completed} hoàn thành
                </p>
              </div>
              {/* Day selector */}
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    className={`day-chip text-xs font-extrabold transition-all px-3 py-1.5 rounded-full border ${
                      selectedDay === i 
                        ? 'bg-white/30 text-white border-white/60 shadow-sm' 
                        : 'bg-transparent text-white/60 border-white/20 hover:bg-white/10'
                    }`}
                    onClick={() => scrollToDay(i, 'smooth')}
                  >
                    {DAYS_SHORT_EN[i]}
                    {i === todayIdx && selectedDay !== i && (
                      <span className="ml-1 text-pink-300">•</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Day progress bar */}
            {dayTasks.length > 0 && (
              <div className="mt-4">
                <div className="progress-bar bg-black/10 h-2 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                  <div 
                    className="progress-fill h-full rounded-full transition-all duration-700" 
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgba(226,115,135,0.6), #E27387)` }} 
                  />
                </div>
                <p className="text-xs text-right mt-1.5 font-black text-pink-100 drop-shadow-sm">{pct}%</p>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="p-4 sm:p-5">
            {dayTasks.length === 0 ? (
              <div className="text-center py-10 liquid-glass border-white/20 rounded-2xl mx-2">
                <div className="text-4xl mb-3 drop-shadow-sm">🌸</div>
                <p className="text-white/90 font-bold text-sm tracking-wide">Không có việc nào cho ngày này!</p>
                <button
                  className="btn-primary mt-5 text-sm shadow-xl shadow-pink-500/20"
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                >
                  + Thêm việc mới
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                  />
                ))}
                <button
                  className="w-full mt-4 py-3.5 rounded-2xl liquid-glass border border-dashed border-white/60 text-white font-bold hover:bg-white/20 transition-all uppercase tracking-widest text-xs"
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                >
                  + Thêm việc cho ngày này
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editTask ? editTask : { day: selectedDay }}
          onClose={() => { setShowModal(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}
