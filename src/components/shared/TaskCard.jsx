// components/shared/TaskCard.jsx
import { Check, Clock, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, DAYS, PERSONS, PRIORITY } from '../../data/initialTasks.js';
import { useApp } from '../../context/AppContext.jsx';
import { CategoryBadge, PersonBadge, PriorityBadge } from './Badge.jsx';

export function TaskCard({ task, showDay = false, onEdit }) {
  const { toggleTask } = useApp();
  const [ripple, setRipple] = useState(false);

  const handleToggle = () => {
    setRipple(true);
    toggleTask(task.id);
    setTimeout(() => setRipple(false), 400);
  };

  return (
    <div
      className={`task-card flex items-start gap-3 p-4 rounded-2xl shadow-sm border mb-2 ${
        task.is_completed
          ? 'task-completed border-green-100'
          : 'bg-white border-pink-50'
      }`}
      style={task.is_completed ? {} : { borderLeftWidth: 4, borderLeftColor: CATEGORIES[task.category]?.color || '#E27387' }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`custom-checkbox mt-0.5 ${task.is_completed ? 'checked' : ''} ${ripple ? 'animate-pulse-pink' : ''}`}
        aria-label={task.is_completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
      >
        {task.is_completed && <Check size={13} color="white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          {task.time && (
            <span className="flex items-center gap-1 text-xs font-700 text-pink-500">
              <Clock size={11} /> {task.time}
            </span>
          )}
          {showDay && (
            <span className="text-xs text-gray-400 font-600">{DAYS[task.day]}</span>
          )}
        </div>

        <p className={`text-sm font-700 leading-snug mb-2 ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {task.title}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <PersonBadge person={task.person} />
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      {/* Actions */}
      {onEdit && (
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-400 hover:text-pink-500 transition-colors flex-shrink-0"
          aria-label="Sửa"
        >
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

// Edit/Add Task Modal
export function TaskModal({ task, onClose, onSave }) {
  const { addTask, updateTask } = useApp();
  const isEdit = !!task?.id;

  const [form, setForm] = useState(task || {
    day: 0, time: '', title: '', person: 'BOTH',
    category: 'HOUSE', priority: 'MEDIUM',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (isEdit) updateTask(task.id, form);
    else addTask(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fadeInUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-800 text-gray-700">
            {isEdit ? '✏️ Sửa công việc' : '✨ Thêm công việc mới'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">Tên công việc *</label>
            <input
              className="input-romantic"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ví dụ: Đi bơi buổi tối..."
            />
          </div>

          {/* Day & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Ngày</label>
              <select className="input-romantic" value={form.day} onChange={e => set('day', +e.target.value)}>
                {['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'].map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Giờ</label>
              <input className="input-romantic" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>

          {/* Person & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Người phụ trách</label>
              <select className="input-romantic" value={form.person} onChange={e => set('person', e.target.value)}>
                {Object.entries(PERSONS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Phân loại</label>
              <select className="input-romantic" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">Ưu tiên</label>
            <div className="flex gap-2">
              {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                <button
                  key={p}
                  onClick={() => set('priority', p)}
                  className="flex-1 py-2 rounded-xl text-xs font-700 border-2 transition-all"
                  style={{
                    borderColor: form.priority === p ? PRIORITY[p].color : '#f0d0d7',
                    background: form.priority === p ? PRIORITY[p].bg : 'white',
                    color: form.priority === p ? PRIORITY[p].color : '#999',
                  }}
                >
                  {PRIORITY[p].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
          <button className="btn-primary flex-1" onClick={handleSave}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới ✨'}
          </button>
        </div>
      </div>
    </div>
  );
}
