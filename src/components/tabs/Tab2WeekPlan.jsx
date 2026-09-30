import { createPortal } from 'react-dom';
import { Check, Filter, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CATEGORIES, DAYS, DAYS_EN, PERSONS } from '../../data/initialTasks.js';
import { TaskModal } from '../shared/TaskCard.jsx';

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

function MiniTaskCard({ task, onEdit }) {
  const cat = CATEGORIES[task.category] || CATEGORIES.WORK;
  const person = PERSONS[task.person] || PERSONS.BOTH;
  
  return (
    <div 
      onClick={() => onEdit(task)}
      className={`relative overflow-hidden p-3 rounded-[16px] border flex items-center gap-3 cursor-pointer transition-all active:scale-95 shadow-sm
        ${task.is_completed ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/10 border-white/10 hover:bg-white/15'}`}
    >
      {/* Category indicator line */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80" 
        style={{ backgroundColor: cat.color }} 
      />
      
      <div className="flex-1 min-w-0 flex flex-col justify-center pl-1">
        <h4 className={`text-xs font-bold truncate ${task.is_completed ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>
          {task.title}
        </h4>
        <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
          {task.time} • {cat.label}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="text-sm bg-black/20 p-1.5 rounded-full shadow-inner">{person.emoji}</div>
        {task.is_completed && <Check size={14} className="text-emerald-400 ml-1" strokeWidth={3} />}
      </div>
    </div>
  );
}

export default function Tab2WeekPlan() {
  const { tasks, deleteTask, resetWeek, totalTasks, completedTasks, bothTasks, progressPct } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showReset, setShowReset] = useState(false);

  // ─── WEEKLY INSIGHTS GENERATOR ───
  const weeklyInsights = useMemo(() => {
    if (tasks.length === 0) return { emoji: '🌱', title: 'Tuần mới rảnh rỗi', text: 'Chưa có kế hoạch nào. Cùng nhau tạo vài công việc hoặc lên lịch hẹn hò nhé!', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30' };
    if (progressPct === 100) return { emoji: '🏆', title: 'Tuyệt đỉnh!', text: 'Mọi kế hoạch đã hoàn tất. Quá xuất sắc! Cuối tuần thư giãn thôi nào!', color: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30' };
    
    const dateCount = tasks.filter(t => t.category === 'DATE').length;
    if (dateCount > 0 && progressPct < 100) return { emoji: '💑', title: 'Chút Lãng Mạn', text: `Tuần này hai bạn có ${dateCount} lịch hẹn hò. Nhớ chuẩn bị thật đẹp và tận hưởng nhé!`, color: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/30' };
    
    if (bothTasks >= 2) return { emoji: '💞', title: 'Gắn Kết', text: `Tuần này có tới ${bothTasks} việc làm cùng nhau. Chúc hai bạn có những phút giây thật vui!`, color: 'from-rose-500/20 to-red-500/10', border: 'border-rose-500/30' };
    
    const workCount = tasks.filter(t => t.category === 'WORK').length;
    if (workCount >= 5) return { emoji: '💪', title: 'Tuần Bận Rộn', text: 'Có vẻ tuần này khá nhiều việc. Đừng quên nhắc nhau nghỉ ngơi uống nước nha!', color: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30' };
    
    if (progressPct >= 50) return { emoji: '🔥', title: 'Đang Bay Cao', text: 'Tiến độ đã qua một nửa! Tiếp tục giữ vững phong độ này nhé!', color: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30' };
    
    return { emoji: '✨', title: 'Năng Lượng', text: 'Cùng nhau hoàn thành các mục tiêu trong tuần này nào!', color: 'from-indigo-500/20 to-purple-500/10', border: 'border-indigo-500/30' };
  }, [tasks, progressPct, bothTasks]);

  const categoryStats = useMemo(() => {
    const stats = {};
    Object.keys(CATEGORIES).forEach(k => stats[k] = 0);
    tasks.forEach(t => {
      if (stats[t.category] !== undefined) stats[t.category]++;
    });
    return Object.keys(CATEGORIES)
      .map(k => ({ key: k, count: stats[k], ...CATEGORIES[k] }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  const personStats = useMemo(() => {
    let male = 0;
    let female = 0;
    let both = 0;
    tasks.forEach(t => {
      if (t.person === 'MALE') male++;
      else if (t.person === 'FEMALE') female++;
      else both++;
    });
    return { male, female, both };
  }, [tasks]);

  const handleReset = () => {
    resetWeek();
    setShowReset(false);
  };

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
          <p className="text-xs text-zinc-400">{tasks.length} công việc tuần này</p>
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

      {/* ─── WEEKLY INSIGHTS WIDGET ─── */}
      <section className={`glass-panel p-4 rounded-[20px] border flex items-start gap-3 shadow-sm ${weeklyInsights.border} bg-gradient-to-br ${weeklyInsights.color}`}>
        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
          {weeklyInsights.emoji}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wide mb-1">{weeklyInsights.title}</h3>
          <p className="text-[11px] text-zinc-300 font-medium leading-snug">{weeklyInsights.text}</p>
        </div>
      </section>

      {/* ─── CATEGORY DISTRIBUTION ─── */}
      <section className="glass-panel p-4 rounded-[24px] shadow-lg">
        <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
          📊 Phân bổ danh mục
        </h3>
        <div className="space-y-3">
          {categoryStats.map(cat => {
            if (cat.count === 0 && tasks.length > 0) return null;
            const pct = tasks.length > 0 ? (cat.count / tasks.length) * 100 : 0;
            return (
              <div key={cat.key}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    {cat.icon} {cat.label}
                  </span>
                  <span className="text-white">{cat.count} việc</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-950 border border-white/10 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${pct}%`, backgroundColor: cat.color }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── PERSON CONTRIBUTION ─── */}
      <section className="glass-panel p-4 rounded-[24px] shadow-lg">
        <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
          🤝 Ai bận rộn nhất tuần?
        </h3>
        <div className="flex items-end justify-between px-2 pt-2 pb-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">{PERSONS.MALE.emoji}</span>
            <span className="text-[11px] font-bold text-zinc-400">{PERSONS.MALE.label}</span>
            <span className="text-lg font-black text-white">{personStats.male}</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-80">
            <span className="text-xl">{PERSONS.BOTH.emoji}</span>
            <span className="text-[10px] font-bold text-zinc-500">{PERSONS.BOTH.label}</span>
            <span className="text-base font-bold text-zinc-300">{personStats.both}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">{PERSONS.FEMALE.emoji}</span>
            <span className="text-[11px] font-bold text-zinc-400">{PERSONS.FEMALE.label}</span>
            <span className="text-lg font-black text-white">{personStats.female}</span>
          </div>
        </div>
        
        {/* Progress bar split */}
        {tasks.length > 0 && (
          <div className="flex h-3 rounded-full overflow-hidden border border-white/10 bg-zinc-950">
            <div style={{ width: `${(personStats.male / tasks.length) * 100}%`, backgroundColor: PERSONS.MALE.color }} title={`Anh ấy: ${personStats.male}`} />
            <div style={{ width: `${(personStats.both / tasks.length) * 100}%`, backgroundColor: PERSONS.BOTH.color }} title={`Cùng nhau: ${personStats.both}`} />
            <div style={{ width: `${(personStats.female / tasks.length) * 100}%`, backgroundColor: PERSONS.FEMALE.color }} title={`Cô ấy: ${personStats.female}`} />
          </div>
        )}
        {tasks.length === 0 && (
          <div className="h-3 rounded-full bg-zinc-950 border border-white/10" />
        )}
      </section>

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
