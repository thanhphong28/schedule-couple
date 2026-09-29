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
    <div className="px-3 sm:px-5 py-4 space-y-5 animate-fadeInUp">
      {/* KPI Cards */}
      <section>
        <h2 className="text-base font-800 text-gray-700 mb-3">📊 Thống kê dài hạn</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🎯', label: 'Tỷ lệ TB', value: `${avgCompletion}%`, color: '#E27387', bg: '#fceef1' },
            { icon: '🏃', label: 'Tuần đạt TT', value: `${sportWeeks} tuần`, color: '#74B9FF', bg: '#eff8ff' },
            { icon: '⭐', label: 'Điểm gắn kết', value: avgRating, color: '#FDCB6E', bg: '#fffbeb' },
            { icon: '🏆', label: 'Kỷ lục cao nhất', value: `${bestCompletion}%`, color: '#00B894', bg: '#e8faf4' },
          ].map((k, i) => (
            <div key={i} className="scorecard text-center shadow-sm border" style={{ background: k.bg, borderColor: k.bg }}>
              <div className="text-2xl mb-1">{k.icon}</div>
              <div className="text-xl font-800" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-gray-400 font-600 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart */}
      <section>
        <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4">
          <h3 className="text-sm font-800 text-gray-700 mb-4">📈 Biểu đồ tiến độ theo tuần</h3>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📊</div>
              <p className="font-600">Chưa có dữ liệu tuần nào</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce4eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Nunito', fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Nunito', fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Nunito' }} />
                <Bar dataKey="Hoàn thành (%)" fill="#E27387" radius={[6, 6, 0, 0]} opacity={0.85} />
                <Line
                  type="monotone"
                  dataKey="Thể thao (buổi)"
                  stroke="#74B9FF"
                  strokeWidth={2.5}
                  dot={{ fill: '#74B9FF', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Review Journal */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-800 text-gray-700">📓 Nhật ký đánh giá các tuần</h2>
          <button
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3"
            onClick={() => { setEditReview(null); setShowModal(true); }}
          >
            <Plus size={14} /> Thêm tuần
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-8 text-center">
            <div className="text-5xl mb-3">📓</div>
            <p className="text-gray-400 font-600">Chưa có nhật ký tuần nào</p>
            <p className="text-xs text-gray-300 mt-1">Hãy thêm tổng kết tuần đầu tiên!</p>
            <button
              className="btn-primary mt-4 text-sm"
              onClick={() => { setEditReview(null); setShowModal(true); }}
            >
              + Ghi nhật ký đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 animate-slide-in">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-800 text-gray-700 text-sm">{review.week_label}</h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-700" style={{ color: '#E27387' }}>
                        📊 {review.completion_rate}% hoàn thành
                      </span>
                      <span className="text-xs font-700 text-blue-500">
                        🏃 {review.sport_sessions} buổi TT
                      </span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={13} fill={(review.rating || 0) >= s ? '#FDCB6E' : 'none'} color={(review.rating || 0) >= s ? '#FDCB6E' : '#d1d5db'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-400 hover:text-pink-500 transition-colors"
                      onClick={() => { setEditReview(review); setShowModal(true); }}
                    >
                      ✏️
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 transition-colors"
                      onClick={() => deleteReview(review.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {(review.good_things || review.improve_things || review.next_plan) && (
                  <div className="space-y-2 text-xs">
                    {review.good_things && (
                      <div className="flex gap-2 p-2 rounded-xl" style={{ background: '#f0fdf4' }}>
                        <span className="font-700 text-green-600">✅</span>
                        <p className="text-green-700 leading-relaxed">{review.good_things}</p>
                      </div>
                    )}
                    {review.improve_things && (
                      <div className="flex gap-2 p-2 rounded-xl" style={{ background: '#fff7ed' }}>
                        <span className="font-700 text-orange-500">⚡</span>
                        <p className="text-orange-700 leading-relaxed">{review.improve_things}</p>
                      </div>
                    )}
                    {review.next_plan && (
                      <div className="flex gap-2 p-2 rounded-xl" style={{ background: '#eff8ff' }}>
                        <span className="font-700 text-blue-500">🎯</span>
                        <p className="text-blue-700 leading-relaxed">{review.next_plan}</p>
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
