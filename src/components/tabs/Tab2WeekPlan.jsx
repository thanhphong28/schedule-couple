// components/tabs/Tab2WeekPlan.jsx
import { Filter, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS, DAYS_EN, PERSONS, PRIORITY } from '../../data/initialTasks.js';
import { CategoryBadge, PersonBadge, PriorityBadge } from '../shared/Badge.jsx';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

function ResetModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔄</div>
          <h3 className="text-lg font-800 text-gray-700 mb-2">Bắt đầu tuần mới?</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Tiến độ tuần hiện tại sẽ được <strong>lưu vào Dashboard</strong> trước khi reset. Bạn chắc chắn muốn tiếp tục?
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
          <button className="btn-primary flex-1" onClick={onConfirm}>✨ Bắt đầu!</button>
        </div>
      </div>
    </div>
  );
}

export default function Tab2WeekPlan() {
  const { tasks, deleteTask, resetWeek, toggleTask } = useApp();

  // Filters
  const [filterPerson, setFilterPerson] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showReset, setShowReset] = useState(false);

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        if (filterPerson !== 'ALL' && t.person !== filterPerson) return false;
        if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
        if (filterStatus === 'DONE' && !t.is_completed) return false;
        if (filterStatus === 'TODO' && t.is_completed) return false;
        if (search && !(t.title || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.day - b.day || a.sort_order - b.sort_order);
  }, [tasks, filterPerson, filterCategory, filterStatus, search]);

  // Group by day
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      if (!g[t.day]) g[t.day] = [];
      g[t.day].push(t);
    });
    return g;
  }, [filtered]);

  const handleReset = () => {
    resetWeek();
    setShowReset(false);
  };

  const hasFilters = filterPerson !== 'ALL' || filterCategory !== 'ALL' || filterStatus !== 'ALL' || search;

  const { totalTasks, completedTasks, bothTasks, progressPct } = useApp();
  const progressColor =
    progressPct >= 80 ? '#00B894' :
    progressPct >= 50 ? '#E27387' :
    '#FDCB6E';

  return (
    <div className="px-3 sm:px-5 py-4 space-y-6 animate-fadeInUp">
      
      {/* Scorecards & Progress Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4">
          <div className="scorecard liquid-glass text-center p-3 sm:p-5 rounded-[24px] sm:rounded-[28px]">
            <div className="text-2xl sm:text-3xl font-black text-pink-300 drop-shadow-md">{totalTasks}</div>
            <div className="text-[10px] sm:text-[11px] text-white/70 font-bold uppercase tracking-wider mt-1.5">Tổng việc</div>
          </div>
          <div className="scorecard liquid-glass text-center p-3 sm:p-5 rounded-[24px] sm:rounded-[28px]">
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 drop-shadow-md">{completedTasks}</div>
            <div className="text-[10px] sm:text-[11px] text-white/70 font-bold uppercase tracking-wider mt-1.5">Đã xong</div>
          </div>
          <div className="scorecard liquid-glass text-center p-3 sm:p-5 rounded-[24px] sm:rounded-[28px]">
            <div className="text-2xl sm:text-3xl font-black text-violet-300 drop-shadow-md">{bothTasks}</div>
            <div className="text-[10px] sm:text-[11px] text-white/70 font-bold uppercase tracking-wider mt-1.5">Cùng nhau</div>
          </div>
          <div className="scorecard liquid-glass text-center p-3 sm:p-5 rounded-[24px] sm:rounded-[28px]">
            <div className="text-2xl sm:text-3xl font-black drop-shadow-md" style={{ color: progressColor }}>{progressPct}%</div>
            <div className="text-[10px] sm:text-[11px] text-white/70 font-bold uppercase tracking-wider mt-1.5">Tiến độ</div>
          </div>
        </div>

        <div className="px-4 py-3 liquid-glass rounded-[20px]">
          <div className="flex justify-between text-[11px] text-white/90 font-bold mb-2 uppercase tracking-wider">
            <span>Tiến độ tuần</span>
            <span style={{ color: progressColor }}>{completedTasks}/{totalTasks}</span>
          </div>
          <div className="progress-bar bg-black/20 h-2.5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
            <div className="progress-fill h-full rounded-full transition-all duration-1000 cubic-bezier(0.2,0.8,0.2,1)" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${progressColor}88, ${progressColor})`, boxShadow: `0 0 12px ${progressColor}88` }} />
          </div>
        </div>
      </div>

      {/* Title + Add + Reset */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-sm uppercase tracking-wide">📋 Kế hoạch cả tuần</h2>
          <p className="text-xs text-white/80 font-bold mt-1 tracking-wide">{filtered.length} / {tasks.length} công việc đang hiển thị</p>
        </div>
        <div className="flex gap-2.5">
          <button
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm border-white/60 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
            onClick={() => setShowReset(true)}
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Tuần mới</span>
          </button>
          <button
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-xl shadow-pink-500/20"
            onClick={() => { setEditTask(null); setShowModal(true); }}
          >
            <Plus size={14} /> Thêm việc
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="liquid-glass rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            className="input-romantic pl-11 bg-white/10 border-white/30 text-white placeholder-white/50 backdrop-blur-sm focus:border-white/60 focus:bg-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
            placeholder="Tìm kiếm công việc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
              <X size={16} className="text-white/80 hover:text-white" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2.5">
          {/* Person filter */}
          <div className="flex gap-1.5 flex-wrap">
            {['ALL', ...Object.keys(PERSONS)].map(k => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3.5 border ${filterPerson === k ? 'bg-white/30 text-white border-white/60 shadow-sm' : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40'}`}
                onClick={() => setFilterPerson(k)}
              >
                {k === 'ALL' ? '👥 Tất cả' : `${PERSONS[k].emoji} ${PERSONS[k].label}`}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {['ALL', ...Object.keys(CATEGORIES)].map(k => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3.5 border ${filterCategory === k ? 'bg-white/30 text-white border-white/60 shadow-sm' : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40'}`}
                onClick={() => setFilterCategory(k)}
              >
                {k === 'ALL' ? '🗂 Tất cả' : `${CATEGORIES[k].icon} ${CATEGORIES[k].label}`}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {[['ALL', '🌀 Tất cả'], ['TODO', '⏳ Chưa xong'], ['DONE', '✅ Hoàn thành']].map(([k, l]) => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3.5 border ${filterStatus === k ? 'bg-white/30 text-white border-white/60 shadow-sm' : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white hover:border-white/40'}`}
                onClick={() => setFilterStatus(k)}
              >
                {l}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              className="text-xs text-pink-200 font-bold underline hover:text-white transition-colors py-1.5 px-2"
              onClick={() => { setFilterPerson('ALL'); setFilterCategory('ALL'); setFilterStatus('ALL'); setSearch(''); }}
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Task List grouped by day */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 liquid-glass rounded-3xl mx-2">
          <div className="text-5xl mb-4 drop-shadow-md">🔍</div>
          <p className="text-white/90 font-bold text-sm tracking-wide">Không tìm thấy công việc nào!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {DAYS.map((day, di) => {
            if (!grouped[di]) return null;
            const dayTasks = grouped[di];
            const done = dayTasks.filter(t => t.is_completed).length;
            return (
              <div key={di} className="liquid-glass rounded-[24px] overflow-hidden">
                {/* Day header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/20 bg-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white drop-shadow-sm uppercase tracking-wide">{DAYS_EN[di]} • {day}</span>
                    <span className="badge liquid-glass border-white/40 text-pink-100 px-2 py-0.5 shadow-sm">
                      {dayTasks.length} việc
                    </span>
                  </div>
                  <span className="text-xs font-black tracking-wide" style={{ color: done === dayTasks.length ? '#bbf7d0' : '#fbcfe8' }}>
                    {done}/{dayTasks.length} ✅
                  </span>
                </div>

                {/* Tasks */}
                <div className="p-4 sm:p-5 space-y-3">
                  {dayTasks.map(task => (
                    <div key={task.id} className="relative group">
                      <TaskCard
                        task={task}
                        onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                      />
                      {/* Delete button */}
                      <button
                        className="absolute top-3 right-12 p-2 rounded-xl opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all backdrop-blur-md border border-red-500/20"
                        onClick={() => deleteTask(task.id)}
                        aria-label="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
        />
      )}
      {showReset && (
        <ResetModal onClose={() => setShowReset(false)} onConfirm={handleReset} />
      )}
    </div>
  );
}
