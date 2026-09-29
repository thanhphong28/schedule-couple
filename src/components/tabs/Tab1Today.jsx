// components/tabs/Tab1Today.jsx
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS } from '../../data/initialTasks.js';
import { getDayIndex } from '../../lib/utils.js';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

// Timetable time slots
const TIME_SLOTS = [
  { label: '🌅 Sáng sớm', range: '06:00 – 08:00', from: '06:00', to: '08:00', color: '#fff8f0', border: '#fddcb5' },
  { label: '☀️ Buổi sáng', range: '08:00 – 11:30', from: '08:00', to: '11:30', color: '#fffef0', border: '#fde68a' },
  { label: '🍱 Buổi trưa', range: '11:30 – 13:30', from: '11:30', to: '13:30', color: '#f0fff8', border: '#a7f3d0' },
  { label: '🌤 Đầu chiều', range: '13:30 – 15:30', from: '13:30', to: '15:30', color: '#f0f8ff', border: '#bfdbfe' },
  { label: '🌇 Cuối chiều', range: '15:30 – 17:30', from: '15:30', to: '17:30', color: '#fef9f0', border: '#fcd34d' },
  { label: '🌆 Hoàng hôn', range: '17:30 – 19:15', from: '17:30', to: '19:15', color: '#fff0f5', border: '#fda4af' },
  { label: '🌙 Buổi tối', range: '19:15 – 22:30', from: '19:15', to: '22:30', color: '#f5f0ff', border: '#c4b5fd' },
  { label: '🌜 Đêm muộn', range: '22:30 – 23:30', from: '22:30', to: '23:30', color: '#f0f0f8', border: '#a5b4fc' },
];

function timeToNum(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function inSlot(taskTime, slot) {
  const t = timeToNum(taskTime);
  const from = timeToNum(slot.from);
  const to = timeToNum(slot.to);
  return t >= from && t < to;
}

function TimetableDay({ dayIdx, tasks }) {
  const dayTasks = tasks.filter(t => t.day === dayIdx);

  return (
    <div className="min-w-[140px] sm:min-w-[180px]">
      {TIME_SLOTS.map((slot, si) => {
        const slotTasks = dayTasks.filter(t => inSlot(t.time, slot));
        return (
          <div
            key={si}
            className="timetable-cell mb-1"
            style={{ background: slotTasks.length ? slot.color : '#fafafa', border: `1px solid ${slotTasks.length ? slot.border : '#f0f0f0'}`, minHeight: 56 }}
          >
            {slotTasks.length === 0 ? (
              <span className="text-gray-300 text-xs">—</span>
            ) : slotTasks.map(t => (
              <div
                key={t.id}
                className="text-xs font-600 leading-tight mb-1 last:mb-0 truncate"
                style={{ color: t.is_completed ? '#86efac' : CATEGORIES[t.category]?.color || '#E27387' }}
                title={t.title}
              >
                {t.is_completed ? '✅ ' : ''}
                {t.time} {t.title.length > 22 ? t.title.slice(0, 22) + '…' : t.title}
              </div>
            ))}
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

  const dayTasks = tasks
    .filter(t => t.day === selectedDay)
    .sort((a, b) => timeToNum(a.time) - timeToNum(b.time));

  const completed = dayTasks.filter(t => t.is_completed).length;
  const pct = dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0;

  return (
    <div className="px-3 sm:px-5 py-4 space-y-5 animate-fadeInUp">
      {/* TIMETABLE OVERVIEW */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base sm:text-lg font-800 text-gray-700">📅 Bảng thời khóa biểu tuần</span>
          <span className="badge" style={{ background: '#fceef1', color: '#E27387' }}>7 ngày</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-pink-50">
          {/* Slot labels column */}
          <div className="flex overflow-x-auto pb-2 px-2 pt-2">
            {/* Time slots header column */}
            <div className="min-w-[100px] sm:min-w-[120px] pr-2 flex-shrink-0">
              <div className="h-8 flex items-center">
                <span className="text-xs font-700 text-gray-400">Khung giờ</span>
              </div>
              {TIME_SLOTS.map((slot, i) => (
                <div key={i} className="mb-1 min-h-[56px] flex items-start pt-1">
                  <div>
                    <div className="text-xs font-700 text-gray-600 leading-tight">{slot.label}</div>
                    <div className="text-xs text-gray-400">{slot.range}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((day, di) => (
              <div key={di} className="flex-shrink-0 px-1">
                <div
                  className={`h-8 flex items-center justify-center text-xs font-700 rounded-lg mb-1 px-2 cursor-pointer transition-all ${
                    di === todayIdx ? 'text-white' : 'text-gray-500 hover:bg-pink-50'
                  }`}
                  style={di === todayIdx ? { background: 'linear-gradient(135deg, #E27387, #c95b72)' } : {}}
                  onClick={() => setSelectedDay(di)}
                >
                  {day.replace('Thứ ', 'T').replace('Chủ Nhật', 'CN')}
                  {di === todayIdx && <span className="ml-1">•</span>}
                </div>
                <TimetableDay dayIdx={di} tasks={tasks} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TODAY FOCUS SECTION */}
      <section>
        <div className="bg-white rounded-2xl shadow-sm border border-pink-50 overflow-hidden">
          {/* Header */}
          <div
            className="px-4 py-4"
            style={{ background: 'linear-gradient(135deg, #fceef1, #fff8f5)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-800 text-gray-700">🎯 Tiêu điểm & Nhiệm vụ</h2>
                <p className="text-xs text-gray-400 font-600 mt-0.5">{dayTasks.length} việc • {completed} hoàn thành</p>
              </div>
              {/* Day selector */}
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    className={`day-chip text-xs ${selectedDay === i ? 'active' : ''}`}
                    onClick={() => setSelectedDay(i)}
                  >
                    {d.replace('Thứ ', 'T').replace('Chủ Nhật', 'CN')}
                    {i === todayIdx && selectedDay !== i && (
                      <span className="ml-1 text-pink-400">•</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Day progress bar */}
            {dayTasks.length > 0 && (
              <div className="mt-3">
                <div className="progress-bar h-2">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-right mt-1 font-700" style={{ color: '#E27387' }}>{pct}%</p>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="p-4">
            {dayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🌸</div>
                <p className="text-gray-400 font-600">Không có việc nào cho ngày này!</p>
                <button
                  className="btn-primary mt-4 text-sm"
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                >
                  + Thêm việc mới
                </button>
              </div>
            ) : (
              <div>
                {dayTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                  />
                ))}
                <button
                  className="w-full mt-2 py-3 rounded-2xl border-2 border-dashed border-pink-200 text-pink-400 text-sm font-700 hover:bg-pink-50 transition-colors"
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
