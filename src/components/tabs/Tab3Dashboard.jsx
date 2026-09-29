// components/tabs/Tab3Dashboard.jsx
import { Plus, Star, Trash2, X } from 'lucide-react';
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
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          className="star-rating"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          aria-label={`${s} sao`}
        >
          <Star
            size={20}
            fill={(hover || value) >= s ? '#FDCB6E' : 'none'}
            color={(hover || value) >= s ? '#FDCB6E' : '#d1d5db'}
            strokeWidth={1.5}
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-fadeInUp max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-800 text-gray-700">
            {review?.id ? '✏️ Sửa đánh giá tuần' : '📝 Tổng kết tuần mới'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">Nhãn tuần *</label>
            <input className="input-romantic" value={form.week_label} onChange={e => set('week_label', e.target.value)} placeholder="VD: Tuần 39 - Tháng 9/2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Tỷ lệ hoàn thành (%)</label>
              <input className="input-romantic" type="number" min="0" max="100" value={form.completion_rate} onChange={e => set('completion_rate', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-700 text-gray-500 mb-1 block">Số buổi thể thao</label>
              <input className="input-romantic" type="number" min="0" max="7" value={form.sport_sessions} onChange={e => set('sport_sessions', +e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">Đánh giá tuần ⭐</label>
            <StarRating value={form.rating} onChange={v => set('rating', v)} />
          </div>

          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">✅ Điều đã làm tốt</label>
            <textarea className="input-romantic" rows={3} value={form.good_things} onChange={e => set('good_things', e.target.value)} placeholder="Tuần này đã làm được gì tốt..." />
          </div>

          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">⚡ Điểm cần cải thiện</label>
            <textarea className="input-romantic" rows={3} value={form.improve_things} onChange={e => set('improve_things', e.target.value)} placeholder="Tuần sau cần cải thiện điều gì..." />
          </div>

          <div>
            <label className="text-xs font-700 text-gray-500 mb-1 block">🎯 Kế hoạch tuần tới</label>
            <textarea className="input-romantic" rows={3} value={form.next_plan} onChange={e => set('next_plan', e.target.value)} placeholder="Mục tiêu cho tuần tới..." />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
          <button className="btn-primary flex-1" onClick={handleSave}>Lưu đánh giá 💕</button>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for chart
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-3 text-sm">
      <p className="font-700 text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-600">
          {p.name}: <strong>{p.value}{p.name.includes('%') ? '' : ''}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Tab3Dashboard() {
  const { reviews, addReview, updateReview, deleteReview, tasks, completedTasks, totalTasks, progressPct } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editReview, setEditReview] = useState(null);

  // Compute KPIs
  const avgCompletion = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + (r.completion_rate || 0), 0) / reviews.length)
    : progressPct;
  const sportWeeks = reviews.filter(r => (r.sport_sessions || 0) >= 3).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';
  const bestCompletion = reviews.length > 0
    ? Math.max(...reviews.map(r => r.completion_rate || 0))
    : progressPct;

  // Chart data (last 8 weeks + current)
  const chartData = [
    ...reviews.slice(0, 7).reverse().map(r => ({
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
    <div className="px-3 sm:px-5 py-4 space-y-6 animate-fadeInUp">
      {/* KPI Cards */}
      <section>
        <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-sm uppercase tracking-wide mb-4">📊 Thống kê dài hạn</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🎯', label: 'Tỷ lệ TB', value: `${avgCompletion}%`, color: '#fbcfe8' },
            { icon: '🏃', label: 'Tuần đạt TT', value: `${sportWeeks} tuần`, color: '#bae6fd' },
            { icon: '⭐', label: 'Điểm gắn kết', value: avgRating, color: '#fef08a' },
            { icon: '🏆', label: 'Kỷ lục cao nhất', value: `${bestCompletion}%`, color: '#bbf7d0' },
          ].map((k, i) => (
            <div key={i} className="scorecard liquid-glass text-center p-4 rounded-3xl">
              <div className="text-3xl mb-2 drop-shadow-sm">{k.icon}</div>
              <div className="text-xl sm:text-2xl font-black drop-shadow-sm" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] sm:text-xs text-white/80 font-bold uppercase tracking-wide mt-1">{k.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart */}
      <section>
        <div className="liquid-glass rounded-3xl p-5 sm:p-6 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
          <h3 className="text-sm font-black text-white drop-shadow-sm uppercase tracking-wide mb-5">📈 Biểu đồ tiến độ</h3>
          {chartData.length === 0 ? (
            <div className="text-center py-10 liquid-glass rounded-2xl border-white/20">
              <div className="text-4xl mb-3 drop-shadow-sm">📊</div>
              <p className="font-bold text-white/80 text-sm tracking-wide">Chưa có dữ liệu tuần nào</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Outfit', fill: 'rgba(255,255,255,0.8)', fontWeight: 600 }} stroke="rgba(255,255,255,0.2)" />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Outfit', fill: 'rgba(255,255,255,0.8)', fontWeight: 600 }} stroke="rgba(255,255,255,0.2)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Outfit', color: 'white', fontWeight: 600 }} />
                <Bar dataKey="Hoàn thành (%)" fill="rgba(255,255,255,0.5)" radius={[8, 8, 0, 0]} opacity={0.9} />
                <Line
                  type="monotone"
                  dataKey="Thể thao (buổi)"
                  stroke="#f4a5b5"
                  strokeWidth={3}
                  dot={{ fill: '#f4a5b5', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#E27387' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Review Journal */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-white drop-shadow-sm uppercase tracking-wide">📓 Nhật ký các tuần</h2>
          <button
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-xl shadow-pink-500/20"
            onClick={() => { setEditReview(null); setShowModal(true); }}
          >
            <Plus size={14} /> Thêm tuần
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-8 text-center border-white/20">
            <div className="text-5xl mb-4 drop-shadow-sm">📓</div>
            <p className="text-white/90 font-bold tracking-wide">Chưa có nhật ký tuần nào</p>
            <p className="text-xs text-white/60 mt-1 font-medium">Hãy thêm tổng kết tuần đầu tiên!</p>
            <button
              className="btn-secondary mt-5 text-xs py-2 px-4 shadow-sm border-white/60 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
              onClick={() => { setEditReview(null); setShowModal(true); }}
            >
              + Ghi nhật ký đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="liquid-glass rounded-3xl p-5 border border-white/30 animate-slide-in hover:bg-white/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-black text-white text-base drop-shadow-sm uppercase tracking-wide">{review.week_label}</h4>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs font-black text-pink-200 tracking-wide bg-black/10 px-2 py-1 rounded-full border border-white/10 shadow-inner">
                        📊 {review.completion_rate}% hoàn thành
                      </span>
                      <span className="text-xs font-black text-sky-200 tracking-wide bg-black/10 px-2 py-1 rounded-full border border-white/10 shadow-inner">
                        🏃 {review.sport_sessions} buổi TT
                      </span>
                      <div className="flex gap-0.5 bg-black/10 px-2 py-1 rounded-full border border-white/10 shadow-inner">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={13} fill={(review.rating || 0) >= s ? '#FDCB6E' : 'none'} color={(review.rating || 0) >= s ? '#FDCB6E' : 'rgba(255,255,255,0.3)'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all backdrop-blur-md border border-white/20"
                      onClick={() => { setEditReview(review); setShowModal(true); }}
                    >
                      ✏️
                    </button>
                    <button
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all backdrop-blur-md border border-red-500/20"
                      onClick={() => deleteReview(review.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {(review.good_things || review.improve_things || review.next_plan) && (
                  <div className="space-y-2.5 text-xs">
                    {review.good_things && (
                      <div className="flex gap-2.5 p-3 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                        <span className="font-bold text-emerald-300 drop-shadow-sm text-sm">✅</span>
                        <p className="text-white/90 font-medium leading-relaxed">{review.good_things}</p>
                      </div>
                    )}
                    {review.improve_things && (
                      <div className="flex gap-2.5 p-3 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                        <span className="font-bold text-amber-300 drop-shadow-sm text-sm">⚡</span>
                        <p className="text-white/90 font-medium leading-relaxed">{review.improve_things}</p>
                      </div>
                    )}
                    {review.next_plan && (
                      <div className="flex gap-2.5 p-3 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                        <span className="font-bold text-sky-300 drop-shadow-sm text-sm">🎯</span>
                        <p className="text-white/90 font-medium leading-relaxed">{review.next_plan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
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
