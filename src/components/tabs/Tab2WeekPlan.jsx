import { createPortal } from 'react-dom';
import { Check, Filter, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS, DAYS_EN, PERSONS } from '../../data/initialTasks.js';
import { TaskCard, TaskModal } from '../shared/TaskCard.jsx';

function ResetModal({ onClose, onConfirm }) {
  const content = (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="bottom-sheet p-6 text-center space-y-4 max-w-sm mx-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-1 pb-2 flex justify-center">
          <div className="w-12 h-1.5 bg-zinc-600/80 rounded-full" />
        </div>
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl shadow-inner">
          🔄
        </div>
        <h3 className="text-lg font-extrabold text-white">Bắt đầu tuần mới?</h3>
        <p className="text-xs text-zinc-300 leading-relaxed px-2">
          Tiến độ tuần hiện tại sẽ được <strong>lưu tự động vào Dashboard</strong> trước khi reset lại danh sách việc. Bạn chắc chắn muốn tiếp tục?
        </p>
        <div className="flex gap-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <button type="button" className="btn-secondary flex-1 py-3" onClick={onClose}>Hủy</button>
          <button type="button" className="btn-primary flex-1 py-3" onClick={onConfirm}>✨ Bắt đầu!</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default function Tab2WeekPlan() {
  const { tasks, deleteTask, resetWeek, totalTasks, completedTasks, bothTasks, progressPct } = useApp();

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

  const progressColor =
    progressPct >= 80 ? '#10B981' :
    progressPct >= 50 ? '#F43F5E' :
    '#F59E0B';

  return (
    <div className="px-3 sm:px-4 py-2 space-y-4 animate-fadeInUp">
      
      {/* ─── METRIC CARDS ─── */}
      <section className="glass-panel p-3.5 rounded-[24px] shadow-lg">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-rose-300">{totalTasks}</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Tổng việc</div>
          </div>
          <div className="text-center p-2 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-emerald-400">{completedTasks}</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Đã xong</div>
          </div>
          <div className="text-center p-2 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-violet-300">{bothTasks}</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Cùng nhau</div>
          </div>
          <div className="text-center p-2 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-xl sm:text-2xl font-black" style={{ color: progressColor }}>{progressPct}%</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Tiến độ</div>
          </div>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-300 font-bold px-1">
            <span>Tiến độ toàn tuần</span>
            <span style={{ color: progressColor }}>{completedTasks}/{totalTasks} việc</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-950/80 overflow-hidden border border-white/10 p-0.5">
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out" 
              style={{ 
                width: `${progressPct}%`, 
                background: `linear-gradient(90deg, ${progressColor}aa, ${progressColor})`,
                boxShadow: `0 0 10px ${progressColor}88`
              }} 
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION TITLE & ACTIONS ─── */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-extrabold text-white">📋 Kế hoạch cả tuần</h2>
          <p className="text-xs text-zinc-400">{filtered.length} / {tasks.length} công việc</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5"
            onClick={() => setShowReset(true)}
          >
            <RefreshCw size={13} />
            <span>Reset tuần</span>
          </button>
          <button
            type="button"
            className="btn-primary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/25"
            onClick={() => { setEditTask(null); setShowModal(true); }}
          >
            <Plus size={14} />
            <span>Thêm việc</span>
          </button>
        </div>
      </div>

      {/* ─── SEARCH & FILTER SECTION ─── */}
      <section className="glass-panel p-3 rounded-[20px] space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="input-romantic pl-10 pr-9 py-2 text-xs"
            placeholder="Tìm kiếm công việc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button 
              type="button"
              onClick={() => setSearch('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scrollable Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {/* Status filters */}
          {[
            ['ALL', 'Tất cả'],
            ['TODO', 'Chưa xong'],
            ['DONE', 'Đã xong']
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterStatus(k)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                filterStatus === k
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Separator */}
          <span className="text-zinc-600 text-xs">|</span>

          {/* Person filters */}
          {['ALL', ...Object.keys(PERSONS)].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterPerson(k)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                filterPerson === k
                  ? 'bg-white/25 text-white border-white/40 shadow-sm'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {k === 'ALL' ? '👥 Tất cả người' : `${PERSONS[k].emoji} ${PERSONS[k].label}`}
            </button>
          ))}

          {/* Separator */}
          <span className="text-zinc-600 text-xs">|</span>

          {/* Category filters */}
          {['ALL', ...Object.keys(CATEGORIES)].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterCategory(k)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                filterCategory === k
                  ? 'bg-white/25 text-white border-white/40 shadow-sm'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {k === 'ALL' ? '🗂 Tất cả loại' : `${CATEGORIES[k].icon} ${CATEGORIES[k].label}`}
            </button>
          ))}

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setFilterPerson('ALL'); setFilterCategory('ALL'); setFilterStatus('ALL'); setSearch(''); }}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-300 underline whitespace-nowrap"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </section>

      {/* ─── GROUPED DAYS LIST ─── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center border-white/10">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-bold text-white">Không tìm thấy công việc nào phù hợp</p>
          <p className="text-xs text-zinc-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((dayName, di) => {
            if (!grouped[di]) return null;
            const dayTasks = grouped[di];
            const done = dayTasks.filter(t => t.is_completed).length;
            const isAllDone = done === dayTasks.length && dayTasks.length > 0;

            return (
              <div key={di} className="glass-panel rounded-[24px] overflow-hidden border border-white/10">
                {/* Day Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-zinc-950/50 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      {DAYS_EN[di]} • {dayName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-zinc-300 border border-white/10">
                      {dayTasks.length} việc
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${isAllDone ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {done}/{dayTasks.length} hoàn thành {isAllDone ? '🎉' : ''}
                  </span>
                </div>

                {/* Day Tasks */}
                <div className="p-3 space-y-2.5">
                  {dayTasks.map(task => (
                    <div key={task.id} className="relative group">
                      <TaskCard
                        task={task}
                        onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODALS ─── */}
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
