import { createPortal } from 'react-dom';
import { Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { useApp } from '../../context/AppContext.jsx';
import { nanoid } from '../../lib/utils.js';

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

function ReviewModal({ review, onClose, onSave }) {
  const [form, setForm] = useState(review || {
    week_label: '',
    completion_rate: 0,
    sport_sessions: 0,
    rating: 3,
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
        {/* Drag Indicator */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-zinc-600/80 rounded-full" />
        </div>

        {/* Header */}
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

        {/* Form Body */}
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

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex-shrink-0">
          <button type="button" className="btn-secondary flex-1 py-3" onClick={onClose}>Hủy</button>
          <button type="button" className="btn-primary flex-1 py-3" onClick={handleSave}>Lưu đánh giá 💕</button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

// Custom dark glass tooltip for chart
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
  const { reviews, addReview, updateReview, deleteReview, tasks, progressPct } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editReview, setEditReview] = useState(null);

  // Compute KPIs
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

  // Chart data
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

  const handleSave = (review) => {
    if (editReview?.id) updateReview(editReview.id, review);
    else addReview(review);
    setEditReview(null);
  };

  return (
    <div className="px-3 sm:px-4 py-2 space-y-4 animate-fadeInUp">
      
      {/* ─── KPI METRIC TILES ─── */}
      <section>
        <h2 className="text-base font-extrabold text-white mb-2.5 px-1 flex items-center gap-1.5">
          <span>📊</span>
          <span>Thống kê hành trình</span>
        </h2>
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

      {/* ─── PROGRESS CHART ─── */}
      <section className="glass-panel rounded-[24px] p-4 border border-white/10 shadow-lg space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider px-1">
          📈 Tiến độ hoàn thành qua các tuần
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

      {/* ─── WEEKLY JOURNAL REVIEWS ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
            <span>📓</span>
            <span>Nhật ký các tuần ({reviews.length})</span>
          </h2>
          <button
            type="button"
            className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-md shadow-rose-500/25"
            onClick={() => { setEditReview(null); setShowModal(true); }}
          >
            <Plus size={14} /> Thêm tuần
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center border-white/10">
            <div className="text-4xl mb-2">📓</div>
            <p className="text-sm font-bold text-white">Chưa có nhật ký tổng kết tuần nào</p>
            <p className="text-xs text-zinc-400 mt-1">Ghi lại những khoảnh khắc và bài học để cùng nhau phát triển nhé!</p>
            <button
              type="button"
              className="btn-secondary mt-4 text-xs py-2 px-4"
              onClick={() => { setEditReview(null); setShowModal(true); }}
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
                {/* Review Header */}
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
                      onClick={() => { setEditReview(review); setShowModal(true); }}
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

                {/* Notes Blocks */}
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

      {/* ─── REVIEW MODAL ─── */}
      {showModal && (
        <ReviewModal
          review={editReview}
          onClose={() => { setShowModal(false); setEditReview(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
