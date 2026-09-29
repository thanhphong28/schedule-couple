// components/shared/TaskCard.jsx
import { Check, Clock, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, DAYS, DAYS_SHORT_EN, PERSONS, PRIORITY } from '../../data/initialTasks.js';
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
      className={`task-card flex items-start gap-3.5 p-4 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] border backdrop-blur-md mb-3 transition-all duration-300 ${
        task.is_completed
          ? 'task-completed bg-white/10 border-white/20 opacity-70'
          : 'bg-white/30 border-white/40 hover:bg-white/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]'
      }`}
      style={task.is_completed ? {} : { borderLeftWidth: 6, borderLeftColor: CATEGORIES[task.category]?.color || '#E27387' }}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`custom-checkbox mt-1 border-2 ${task.is_completed ? 'checked border-transparent shadow-[0_0_10px_rgba(226,115,135,0.4)]' : 'border-white/60 bg-white/20'} ${ripple ? 'animate-pulse-pink' : ''}`}
        aria-label={task.is_completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
      >
        {task.is_completed && <Check size={14} color="white" strokeWidth={4} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          {task.time && (
            <span className="flex items-center gap-1.5 text-xs font-black text-pink-500 drop-shadow-sm tracking-wide bg-white/40 px-2 py-0.5 rounded-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
              <Clock size={12} strokeWidth={2.5} /> {task.time}
            </span>
          )}
          {showDay && (
            <span className="text-xs text-white/90 font-bold uppercase tracking-wider">{DAYS[task.day]}</span>
          )}
        </div>

        <p className={`text-[15px] font-black leading-snug mb-3 tracking-wide drop-shadow-sm ${task.is_completed ? 'line-through text-white/50' : 'text-white'}`}>
          {task.title}
        </p>

        <div className="flex flex-wrap gap-2">
          <PersonBadge person={task.person} />
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      {/* Actions */}
      {onEdit && (
        <button
          onClick={() => onEdit(task)}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white/80 hover:text-white shadow-sm border border-white/30 transition-all flex-shrink-0"
          aria-label="Sửa"
        >
          <Pencil size={15} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// Edit/Add Task Modal
export function TaskModal({ task, onClose, onSave }) {
  const { tasks, addTask, updateTask, deleteTask } = useApp();
  const isEdit = !!task?.id;

  // Find linked tasks (same title, time, category) if editing
  const linkedTasks = isEdit 
    ? tasks.filter(t => t.title === task.title && t.time === task.time && t.category === task.category)
    : [];
    
  const initialDays = isEdit ? linkedTasks.map(t => t.day) : (task?.day !== undefined ? [task.day] : [0]);

  const [form, setForm] = useState(task || {
    time: '', title: '', person: 'BOTH',
    category: 'HOUSE', priority: 'MEDIUM',
  });

  const [selectedDays, setSelectedDays] = useState(initialDays);

  const toggleDay = (d) => {
    if (selectedDays.includes(d)) {
      if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(x => x !== d));
    } else {
      setSelectedDays([...selectedDays, d]);
    }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.title.trim()) return;
    const sortedDays = [...selectedDays].sort();
    
    const baseForm = { ...form };
    delete baseForm.day;
    delete baseForm.id;
    delete baseForm.is_completed;
    delete baseForm.status;

    if (isEdit) {
      // Sync across all selected days
      sortedDays.forEach(d => {
        const existing = linkedTasks.find(t => t.day === d);
        if (existing) {
          updateTask(existing.id, { ...baseForm });
        } else {
          addTask({ ...baseForm, day: d });
        }
      });
      
      // Delete tasks for days that were unselected
      linkedTasks.forEach(t => {
        if (!sortedDays.includes(t.day)) {
          deleteTask(t.id);
        }
      });
    } else {
      sortedDays.forEach(d => addTask({ ...baseForm, day: d }));
    }
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

          {/* Days Selection */}
          <div>
            <label className="text-xs font-700 text-gray-500 mb-2 block">Ngày áp dụng (chọn được nhiều ngày)</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_SHORT_EN.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-700 transition-all ${
                    selectedDays.includes(i) 
                      ? 'bg-pink-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Giờ bắt đầu</label>
              <input 
                className="input-romantic" 
                type="time" 
                value={(form.time || '').split('-')[0]?.trim() || ''} 
                onChange={e => {
                  const parts = (form.time || '').split('-');
                  const start = e.target.value;
                  const end = parts[1] ? parts[1].trim() : '';
                  set('time', end ? `${start} - ${end}` : start);
                }} 
              />
            </div>
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Giờ kết thúc (Tuỳ chọn)</label>
              <input 
                className="input-romantic" 
                type="time" 
                value={(form.time || '').split('-')[1]?.trim() || ''} 
                onChange={e => {
                  const start = (form.time || '').split('-')[0]?.trim() || '00:00';
                  const end = e.target.value;
                  set('time', end ? `${start} - ${end}` : start);
                }} 
              />
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
          {isEdit && (
            <button 
              className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center flex-shrink-0" 
              onClick={() => { deleteTask(task.id); onClose(); }}
              title="Xóa công việc"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
          <button className="btn-primary flex-1" onClick={handleSave}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới ✨'}
          </button>
        </div>
      </div>
    </div>
  );
}
