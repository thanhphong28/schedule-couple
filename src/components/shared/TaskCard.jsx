import { createPortal } from 'react-dom';
import { Check, Clock, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, DAYS, DAYS_SHORT_EN, PERSONS, PRIORITY } from '../../data/initialTasks.js';
import { useApp } from '../../context/AppContext.jsx';
import { CategoryBadge, PersonBadge, PriorityBadge } from './Badge.jsx';

export function TaskCard({ task, showDay = false, onEdit }) {
  const { toggleTask } = useApp();
  const [ripple, setRipple] = useState(false);

  const handleToggle = (e) => {
    e.stopPropagation();
    setRipple(true);
    toggleTask(task.id);
    setTimeout(() => setRipple(false), 300);
  };

  const categoryColor = CATEGORIES[task.category]?.color || '#F43F5E';

  return (
    <div
      onClick={() => onEdit?.(task)}
      className={`task-card relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl cursor-pointer select-none transition-all duration-200 border ${
        task.is_completed
          ? 'task-completed bg-zinc-900/40 border-white/5 opacity-60'
          : 'bg-zinc-900/70 border-white/10 hover:border-white/20 active:scale-[0.99] shadow-lg'
      }`}
    >
      {/* Left Colored Accent Strip */}
      <div 
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all"
        style={{ 
          backgroundColor: task.is_completed ? '#52525b' : categoryColor,
          boxShadow: task.is_completed ? 'none' : `0 0 8px ${categoryColor}88`
        }} 
      />

      {/* Checkbox (Touch Target >= 44px hit area) */}
      <div className="pl-1 pt-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          className={`custom-checkbox ${task.is_completed ? 'checked' : ''} ${ripple ? 'scale-110' : ''}`}
          aria-label={task.is_completed ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
        >
          {task.is_completed && <Check size={16} className="text-white" strokeWidth={3.5} />}
        </button>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Meta info: Time & Day */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {task.time && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-md">
              <Clock size={11} strokeWidth={2.5} /> {task.time}
            </span>
          )}
          {showDay && (
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              {DAYS[task.day]}
            </span>
          )}
        </div>

        {/* Task Title */}
        <h4 className={`text-sm font-bold leading-snug mb-2 transition-all ${
          task.is_completed ? 'line-through text-zinc-400 font-medium' : 'text-white'
        }`}>
          {task.title}
        </h4>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <PersonBadge person={task.person} />
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      {/* Edit Button */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-2 -mr-1 -mt-0.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90 flex-shrink-0"
          aria-label="Sửa công việc"
        >
          <Pencil size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// Mobile Bottom Sheet for Edit/Add Task
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

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bottom-sheet flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Indicator Handle */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-zinc-600/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>{isEdit ? '✏️' : '✨'}</span>
            <span>{isEdit ? 'Sửa công việc' : 'Thêm công việc mới'}</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[65dvh]">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block">
              Tên công việc <span className="text-rose-400">*</span>
            </label>
            <input
              className="input-romantic"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ví dụ: Đi bơi, xem phim, dọn phòng..."
              autoFocus
            />
          </div>

          {/* Days Selection */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
              <span>Ngày áp dụng</span>
              <span className="text-[11px] text-zinc-400 font-normal">Đã chọn {selectedDays.length} ngày</span>
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_SHORT_EN.map((d, i) => {
                const isSelected = selectedDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border text-center active:scale-95 ${
                      isSelected 
                        ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
                        : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-700/80'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Giờ bắt đầu</label>
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
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Giờ kết thúc (tuỳ chọn)</label>
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

          {/* Person Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-2 block">Người phụ trách</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PERSONS).map(([k, v]) => {
                const isSelected = form.person === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('person', k)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/40 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 border-white/10 hover:bg-zinc-700/60 hover:text-white'
                    }`}
                  >
                    <span>{v.emoji}</span>
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-2 block">Phân loại</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(CATEGORIES).map(([k, v]) => {
                const isSelected = form.category === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('category', k)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 active:scale-95 ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/50 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 border-white/10 hover:bg-zinc-700/60 hover:text-white'
                    }`}
                  >
                    <span>{v.icon}</span>
                    <span className="truncate">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-2 block">Độ ưu tiên</label>
            <div className="grid grid-cols-3 gap-2">
              {['HIGH', 'MEDIUM', 'LOW'].map(p => {
                const isSelected = form.priority === p;
                const dotColor = p === 'HIGH' ? 'bg-rose-500' : p === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/40 shadow-sm'
                        : 'bg-zinc-800/60 text-zinc-400 border-white/10 hover:bg-zinc-700/60 hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{PRIORITY[p].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex-shrink-0">
          {isEdit && (
            <button 
              type="button"
              className="p-3 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-colors active:scale-95 flex items-center justify-center flex-shrink-0" 
              onClick={() => { deleteTask(task.id); onClose(); }}
              title="Xóa công việc"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            type="button" 
            className="btn-secondary flex-1 py-3" 
            onClick={onClose}
          >
            Hủy
          </button>
          <button 
            type="button" 
            className="btn-primary flex-1 py-3" 
            onClick={handleSave}
          >
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới ✨'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
