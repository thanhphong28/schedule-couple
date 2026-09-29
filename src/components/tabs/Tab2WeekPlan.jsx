// components/tabs/Tab2WeekPlan.jsx
import { Filter, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS, PERSONS, PRIORITY } from '../../data/initialTasks.js';
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
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
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

  return (
    <div className="px-3 sm:px-5 py-4 space-y-4 animate-fadeInUp">
      {/* Title + Add + Reset */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-800 text-gray-700">📋 Kế hoạch cả tuần</h2>
          <p className="text-xs text-gray-400 font-600">{filtered.length} / {tasks.length} công việc đang hiển thị</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            onClick={() => setShowReset(true)}
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Tuần mới</span>
          </button>
          <button
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3"
            onClick={() => { setEditTask(null); setShowModal(true); }}
          >
            <Plus size={14} /> Thêm việc
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-romantic pl-9"
            placeholder="Tìm kiếm công việc..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Person filter */}
          <div className="flex gap-1 flex-wrap">
            {['ALL', ...Object.keys(PERSONS)].map(k => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3 ${filterPerson === k ? 'active' : ''}`}
                onClick={() => setFilterPerson(k)}
              >
                {k === 'ALL' ? '👥 Tất cả' : `${PERSONS[k].emoji} ${PERSONS[k].label}`}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            {['ALL', ...Object.keys(CATEGORIES)].map(k => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3 ${filterCategory === k ? 'active' : ''}`}
                onClick={() => setFilterCategory(k)}
              >
                {k === 'ALL' ? '🗂 Tất cả' : `${CATEGORIES[k].icon} ${CATEGORIES[k].label}`}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {[['ALL', '🌀 Tất cả'], ['TODO', '⏳ Chưa xong'], ['DONE', '✅ Hoàn thành']].map(([k, l]) => (
              <button
                key={k}
                className={`day-chip text-xs py-1.5 px-3 ${filterStatus === k ? 'active' : ''}`}
                onClick={() => setFilterStatus(k)}
              >
                {l}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              className="text-xs text-pink-500 font-700 underline"
              onClick={() => { setFilterPerson('ALL'); setFilterCategory('ALL'); setFilterStatus('ALL'); setSearch(''); }}
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Task List grouped by day */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-400 font-600">Không tìm thấy công việc nào!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day, di) => {
            if (!grouped[di]) return null;
            const dayTasks = grouped[di];
            const done = dayTasks.filter(t => t.is_completed).length;
            return (
              <div key={di} className="bg-white rounded-2xl border border-pink-50 shadow-sm overflow-hidden">
                {/* Day header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ background: 'linear-gradient(90deg, #fceef1, #fff8f5)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-800 text-gray-700">{day}</span>
                    <span className="badge" style={{ background: '#fceef1', color: '#E27387' }}>
                      {dayTasks.length} việc
                    </span>
                  </div>
                  <span className="text-xs font-700" style={{ color: done === dayTasks.length ? '#00B894' : '#E27387' }}>
                    {done}/{dayTasks.length} ✅
                  </span>
                </div>

                {/* Tasks */}
                <div className="p-3">
                  {dayTasks.map(task => (
                    <div key={task.id} className="relative group">
                      <TaskCard
                        task={task}
                        onEdit={(t) => { setEditTask(t); setShowModal(true); }}
                      />
                      {/* Delete button */}
                      <button
                        className="absolute top-3 right-12 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all"
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
