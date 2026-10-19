// components/tabs/Tab3Dashboard.jsx
// Tab Thống Kê Hợp Nhất (Unified Analytics & Weekly Planning)
// Kết hợp Kế hoạch cả tuần, phân bổ danh mục, đóng góp cặp đôi, biểu đồ xu hướng và nhật ký hành trình.
import { createPortal } from 'react-dom';
import { 
  BarChart3, TrendingUp, Plus, RefreshCw, Star, Trash2, X, 
  Sparkles, Check, Heart, Calendar, Users, Flame 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { useApp } from '../../context/AppContext.jsx';
import { nanoid } from '../../lib/utils.js';
import { CATEGORIES, PERSONS } from '../../data/initialTasks.js';
import { TaskModal } from '../shared/TaskCard.jsx';

// ─── MODAL RESET TUẦN ───
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
          Tiến độ tuần hiện tại sẽ được <strong>lưu tự động vào Thống kê</strong> trước khi làm mới danh sách việc. Bạn chắc chắn muốn tiếp tục?
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

// ─── ĐÁNH GIÁ SAO (STAR RATING) ───
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          className="p-1 rounded-xl hover:bg-white/10 transition-all active:scale-90"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          aria-label={`${s} sao`}
        >
          <Star
            size={24}
            fill={(hover || value) >= s ? '#FBBF24' : 'transparent'}
            color={(hover || value) >= s ? '#FBBF24' : 'rgba(255,255,255,0.25)'}
            strokeWidth={1.8}
            className="transition-colors"
          />
        </button>
      ))}
    </div>
  );
}

// ─── MODAL NHẬT KÝ ĐÁNH GIÁ TUẦN ───
function ReviewModal({ review, onClose, onSave }) {
  const [form, setForm] = useState(review || {
    week_label: '',
    completion_rate: 0,
    sport_sessions: 0,
    rating: 5,
    good_things: '',
    improve_things: '',
    next_plan: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.week_label.trim()) return;
    onSave({ id: review?.id || nanoid(), created_at: review?.created_at || new Date().toISOString(), ...form });
    onClose();
  };

  const content = (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="bottom-sheet flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-zinc-600/80 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>{review?.id ? '✏️' : '📝'}</span>
            <span>{review?.id ? 'Sửa đánh giá tuần' : 'Tổng kết tuần mới'}</span>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[65dvh]">
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Nhãn tuần *</label>
            <input 
              className="input-romantic" 
              value={form.week_label} 
              onChange={e => set('week_label', e.target.value)} 
              placeholder="VD: Tuần 39 - Tháng 9/2026" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Tỷ lệ hoàn thành (%)</label>
              <input 
                className="input-romantic" 
                type="number" 
                min="0" 
                max="100" 
                value={form.completion_rate} 
                onChange={e => set('completion_rate', +e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block">Số buổi thể thao</label>
              <input 
                className="input-romantic" 
                type="number" 
                min="0" 
                max="7" 
                value={form.sport_sessions} 
                onChange={e => set('sport_sessions', +e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1 block">Đánh giá độ gắn kết ⭐</label>
            <StarRating value={form.rating} onChange={v => set('rating', v)} />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block">✅ Điều đã làm tốt tuần qua</label>
            <textarea 
              className="input-romantic" 
              rows={2} 
              value={form.good_things} 
              onChange={e => set('good_things', e.target.value)} 
              placeholder="Tuần này đã làm được gì vui và tốt..." 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block">⚡ Điểm cần cải thiện</label>
            <textarea 
              className="input-romantic" 
              rows={2} 
              value={form.improve_things} 
              onChange={e => set('improve_things', e.target.value)} 
              placeholder="Tuần sau cần sắp xếp thời gian như thế nào..." 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1.5 block">🎯 Kế hoạch & mục tiêu tuần tới</label>
            <textarea 
              className="input-romantic" 
              rows={2} 
              value={form.next_plan} 
              onChange={e => set('next_plan', e.target.value)} 
              placeholder="Mục tiêu lớn nhất của hai đứa tuần tới..." 
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex-shrink-0">
          <button type="button" className="btn-secondary flex-1 py-3" onClick={onClose}>Hủy</button>
          <button type="button" className="btn-primary flex-1 py-3" onClick={handleSave}>Lưu đánh giá 💕</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

// ─── TOOLTIP BIỂU ĐỒ ───
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1">
      <p className="font-extrabold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold flex items-center justify-between gap-3">
          <span>{p.name}:</span>
          <span>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Tab3Dashboard() {
  const { 
    tasks, 
    reviews, 
    addReview, 
    updateReview, 
    deleteReview, 
    resetWeek, 
    totalTasks, 
    completedTasks, 
    bothTasks, 
    progressPct 
  } = useApp();

  // Sub-tab: 'week' (Kế hoạch & phân bổ tuần này) | 'journey' (Xu hướng biểu đồ & nhật ký)
  const [subTab, setSubTab] = useState('week');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editReview, setEditReview] = useState(null);

  // ─── TÍNH TOÁN DỮ LIỆU TUẦN HIỆN TẠI ───
  const progressColor =
    progressPct >= 80 ? '#10B981' :
    progressPct >= 50 ? '#F43F5E' :
    '#F59E0B';

  const weeklyInsights = useMemo(() => {
    if (tasks.length === 0) return { emoji: '🌱', title: 'Tuần mới thảnh thơi', text: 'Chưa có kế hoạch nào. Cùng nhau tạo vài công việc hoặc lên lịch hẹn hò nhé!', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30' };
    if (progressPct === 100) return { emoji: '🏆', title: 'Tuyệt đỉnh hoàn hảo!', text: 'Mọi kế hoạch đã hoàn tất. Quá xuất sắc! Cuối tuần thư giãn thôi nào!', color: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30' };
    
    const dateCount = tasks.filter(t => t.category === 'DATE').length;
    if (dateCount > 0 && progressPct < 100) return { emoji: '💑', title: 'Chút Lãng Mạn', text: `Tuần này hai bạn có ${dateCount} lịch hẹn hò. Nhớ chuẩn bị thật đẹp và tận hưởng nhé!`, color: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/30' };
    
    if (bothTasks >= 2) return { emoji: '💞', title: 'Gắn Kết Đồng Hành', text: `Tuần này có tới ${bothTasks} việc làm cùng nhau. Chúc hai bạn có những phút giây thật vui!`, color: 'from-rose-500/20 to-red-500/10', border: 'border-rose-500/30' };
    
    const workCount = tasks.filter(t => t.category === 'WORK').length;
    if (workCount >= 5) return { emoji: '💪', title: 'Tuần Bận Rộn', text: 'Có vẻ tuần này khá nhiều việc. Đừng quên nhắc nhau nghỉ ngơi và uống nước lọc nha!', color: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30' };
    
    if (progressPct >= 50) return { emoji: '🔥', title: 'Đang Bay Cao', text: 'Tiến độ đã qua một nửa! Tiếp tục giữ vững phong độ này nhé!', color: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30' };
    
    return { emoji: '✨', title: 'Năng Lượng Tươi Mới', text: 'Cùng nhau hoàn thành các mục tiêu trong tuần này nào!', color: 'from-indigo-500/20 to-purple-500/10', border: 'border-indigo-500/30' };
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

  // ─── TÍNH TOÁN DỮ LIỆU HÀNH TRÌNH DÀI HẠN ───
  const avgCompletion = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + (r.completion_rate || 0), 0) / reviews.length)
    : progressPct;
  const sportWeeks = reviews.filter(r => (r.sport_sessions || 0) >= 3).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '5.0';
  const bestCompletion = reviews.length > 0
    ? Math.max(...reviews.map(r => r.completion_rate || 0))
    : progressPct;

  const chartData = [
    ...reviews.slice(0, 6).reverse().map(r => ({
      name: r.week_label?.split(' - ')[0] || 'Tuần ?',
      'Hoàn thành (%)': r.completion_rate || 0,
      'Thể thao (buổi)': r.sport_sessions || 0,
    })),
    {
      name: 'Tuần này',
      'Hoàn thành (%)': progressPct,
      'Thể thao (buổi)': tasks.filter(t => t.category === 'SPORT' && t.is_completed).length,
    },
  ];

  const handleResetConfirm = () => {
    resetWeek();
    setShowResetModal(false);
  };

  const handleSaveReview = (review) => {
    if (editReview?.id) updateReview(editReview.id, review);
    else addReview(review);
    setEditReview(null);
  };

  return (
    <div className="px-3 sm:px-4 py-2 space-y-4 animate-fadeInUp pb-24">
      
      {/* ─── TIÊU ĐỀ CHÍNH ─── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <span>📊</span>
            <span>Thống Kê & Hành Trình</span>
          </h1>
          <p className="text-xs text-zinc-400">Tiến độ công việc, phân bổ và nhật ký gắn kết của hai bạn 💕</p>
        </div>
      </div>

      {/* ─── NÚT CHUYỂN TAB CON (SUB-TABS) ─── */}
      <div className="flex p-1 bg-zinc-900/80 rounded-2xl border border-white/10 shadow-inner">
        <button
          type="button"
          onClick={() => setSubTab('week')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'week'
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white shadow-md shadow-rose-500/25 scale-[1.01]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 size={15} />
          <span>Kế Hoạch & Tuần Này</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('journey')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            subTab === 'journey'
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white shadow-md shadow-rose-500/25 scale-[1.01]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp size={15} />
          <span>Xu Hướng & Nhật Ký {reviews.length > 0 && `(${reviews.length})`}</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PHẦN 1: KẾ HOẠCH & TIẾN ĐỘ TUẦN NÀY (SUBTAB === 'WEEK') */}
      {/* ═══════════════════════════════════════════════════════ */}
      {subTab === 'week' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 1.1 Khối chỉ số tuần này */}
          <section className="glass-panel p-3.5 rounded-[24px] shadow-lg border border-white/10">
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

            {/* Thanh tiến độ tuần */}
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

          {/* 1.2 Nút thao tác nhanh & Insight lãng mạn */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>📋</span>
                <span>Kế hoạch tuần ({totalTasks} việc)</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                onClick={() => setShowResetModal(true)}
              >
                <RefreshCw size={12} />
                <span>Reset tuần</span>
              </button>
              <button
                type="button"
                className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/25"
                onClick={() => { setEditTask(null); setShowTaskModal(true); }}
              >
                <Plus size={13} />
                <span>Thêm việc</span>
              </button>
            </div>
          </div>

          {/* Khối gợi ý tình yêu tuần này */}
          <section className={`glass-panel p-3.5 rounded-[20px] border flex items-start gap-3 shadow-sm ${weeklyInsights.border} bg-gradient-to-br ${weeklyInsights.color}`}>
            <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
              {weeklyInsights.emoji}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-xs font-black text-white uppercase tracking-wide mb-1">{weeklyInsights.title}</h3>
              <p className="text-[11px] text-zinc-300 font-medium leading-snug">{weeklyInsights.text}</p>
            </div>
          </section>

          {/* 1.3 Phân bổ danh mục công việc */}
          <section className="glass-panel p-4 rounded-[24px] shadow-lg border border-white/10">
            <h3 className="text-sm font-extrabold text-white mb-3 flex items-center gap-2">
              <span>📊</span>
              <span>Phân bổ danh mục</span>
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

          {/* 1.4 Đóng góp của cặp đôi (Ai bận rộn nhất) */}
          <section className="glass-panel p-4 rounded-[24px] shadow-lg border border-white/10">
            <h3 className="text-sm font-extrabold text-white mb-3 flex items-center gap-2">
              <span>🤝</span>
              <span>Ai bận rộn nhất tuần?</span>
            </h3>
            <div className="flex items-end justify-between px-2 pt-1 pb-4">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-2xl">{PERSONS.MALE.emoji}</span>
                <span className="text-[11px] font-bold text-zinc-400">{PERSONS.MALE.label}</span>
                <span className="text-base font-black text-white">{personStats.male} việc</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 opacity-80">
                <span className="text-xl">{PERSONS.BOTH.emoji}</span>
                <span className="text-[10px] font-bold text-zinc-500">{PERSONS.BOTH.label}</span>
                <span className="text-sm font-bold text-zinc-300">{personStats.both} việc</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-2xl">{PERSONS.FEMALE.emoji}</span>
                <span className="text-[11px] font-bold text-zinc-400">{PERSONS.FEMALE.label}</span>
                <span className="text-base font-black text-white">{personStats.female} việc</span>
              </div>
            </div>
            
            {/* Thanh phân chia tỷ lệ */}
            {tasks.length > 0 && (
              <div className="flex h-3 rounded-full overflow-hidden border border-white/10 bg-zinc-950">
                <div style={{ width: `${(personStats.male / tasks.length) * 100}%`, backgroundColor: PERSONS.MALE.color }} title={`Anh ấy: ${personStats.male}`} />
                <div style={{ width: `${(personStats.both / tasks.length) * 100}%`, backgroundColor: PERSONS.BOTH.color }} title={`Cùng nhau: ${personStats.both}`} />
                <div style={{ width: `${(personStats.female / tasks.length) * 100}%`, backgroundColor: PERSONS.FEMALE.color }} title={`Cô ấy: ${personStats.female}`} />
              </div>
            )}
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PHẦN 2: XU HƯỚNG & NHẬT KÝ HÀNH TRÌNH (SUBTAB === 'JOURNEY') */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {subTab === 'journey' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 2.1 4 Chỉ số KPI hành trình */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: '🎯', label: 'Tỷ lệ TB', value: `${avgCompletion}%`, color: '#FB7185' },
                { icon: '🏃', label: 'Tuần thể thao', value: `${sportWeeks} tuần`, color: '#38BDF8' },
                { icon: '⭐', label: 'Điểm gắn kết', value: avgRating, color: '#FBBF24' },
                { icon: '🏆', label: 'Kỷ lục tuần', value: `${bestCompletion}%`, color: '#34D399' },
              ].map((k, i) => (
                <div key={i} className="glass-panel text-center p-3 rounded-2xl border border-white/10 shadow-md">
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <div className="text-xl font-black" style={{ color: k.color }}>{k.value}</div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 2.2 Biểu đồ tiến độ hoàn thành qua các tuần */}
          <section className="glass-panel rounded-[24px] p-4 border border-white/10 shadow-lg space-y-3">
            <h3 className="text-xs font-black text-white uppercase tracking-wider px-1 flex items-center gap-1.5">
              <span>📈</span>
              <span>Tiến độ hoàn thành qua các tuần</span>
            </h3>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)', fontWeight: 600 }} 
                    stroke="rgba(255,255,255,0.1)" 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)', fontWeight: 600 }} 
                    stroke="rgba(255,255,255,0.1)" 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, paddingTop: '6px' }} 
                  />
                  <Bar 
                    dataKey="Hoàn thành (%)" 
                    fill="#FB7185" 
                    radius={[6, 6, 0, 0]} 
                    opacity={0.85} 
                  />
                  <Line
                    type="monotone"
                    dataKey="Thể thao (buổi)"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    dot={{ fill: '#38BDF8', r: 4, strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#0EA5E9' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 2.3 Nhật ký các tuần (Love Reviews) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>📓</span>
                <span>Nhật ký các tuần ({reviews.length})</span>
              </h2>
              <button
                type="button"
                className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-md shadow-rose-500/25"
                onClick={() => { setEditReview(null); setShowReviewModal(true); }}
              >
                <Plus size={13} /> <span>Thêm tuần</span>
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 text-center border-white/10">
                <div className="text-4xl mb-2">📓</div>
                <p className="text-sm font-bold text-white">Chưa có nhật ký tổng kết tuần nào</p>
                <p className="text-xs text-zinc-400 mt-1">Ghi lại những khoảnh khắc và bài học để cùng nhau phát triển nhé!</p>
                <button
                  type="button"
                  className="btn-secondary mt-4 text-xs py-2 px-4 rounded-xl"
                  onClick={() => { setEditReview(null); setShowReviewModal(true); }}
                >
                  + Ghi nhật ký tuần đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div 
                    key={review.id} 
                    className="glass-panel rounded-[22px] p-4 border border-white/10 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-white text-sm tracking-wide">{review.week_label}</h4>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">
                            📊 {review.completion_rate}% hoàn thành
                          </span>
                          <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-500/25 px-2 py-0.5 rounded-full">
                            🏃 {review.sport_sessions} buổi thể thao
                          </span>
                          <div className="flex gap-0.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star 
                                key={s} 
                                size={11} 
                                fill={(review.rating || 0) >= s ? '#FBBF24' : 'transparent'} 
                                color={(review.rating || 0) >= s ? '#FBBF24' : 'rgba(255,255,255,0.2)'} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all active:scale-95"
                          onClick={() => { setEditReview(review); setShowReviewModal(true); }}
                          aria-label="Sửa đánh giá"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all active:scale-95"
                          onClick={() => deleteReview(review.id)}
                          aria-label="Xóa đánh giá"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {(review.good_things || review.improve_things || review.next_plan) && (
                      <div className="space-y-2 pt-1 text-xs">
                        {review.good_things && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-zinc-200">
                            <span className="font-bold text-emerald-300 mr-1.5">💚 Đã làm tốt:</span>
                            <span>{review.good_things}</span>
                          </div>
                        )}
                        {review.improve_things && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-zinc-200">
                            <span className="font-bold text-amber-300 mr-1.5">⚡ Cải thiện:</span>
                            <span>{review.improve_things}</span>
                          </div>
                        )}
                        {review.next_plan && (
                          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-zinc-200">
                            <span className="font-bold text-sky-300 mr-1.5">🎯 Tuần tới:</span>
                            <span>{review.next_plan}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {showTaskModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
        />
      )}
      {showResetModal && (
        <ResetModal onClose={() => setShowResetModal(false)} onConfirm={handleResetConfirm} />
      )}
      {showReviewModal && (
        <ReviewModal
          review={editReview}
          onClose={() => { setShowReviewModal(false); setEditReview(null); }}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
}
