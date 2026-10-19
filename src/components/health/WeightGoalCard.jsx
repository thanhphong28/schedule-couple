// components/health/WeightGoalCard.jsx
// Theo dõi cân nặng mục tiêu, tiến trình và ghi nhận cân nặng theo ngày
import { useState } from 'react';
import { Target, TrendingDown, TrendingUp, Scale, Plus, Calendar, History, Check } from 'lucide-react';
import { calculateBMI } from '../../services/healthPersonalization.js';

export default function WeightGoalCard({
  profile,
  weightLogs = [],
  onLogWeight,
  onOpenWizard,
  isReadOnly = false,
  personName = 'Bạn'
}) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [note, setNote] = useState('');

  const currentWeight = profile?.current_weight || (weightLogs[0]?.weight ? parseFloat(weightLogs[0].weight) : null);
  const targetWeight = profile?.target_weight ? parseFloat(profile.target_weight) : null;
  const height = profile?.height ? parseFloat(profile.height) : null;
  const bmiInfo = currentWeight && height ? calculateBMI(currentWeight, height) : null;

  // Tính chênh lệch
  const diff = currentWeight && targetWeight ? (currentWeight - targetWeight).toFixed(1) : null;
  const isLosing = targetWeight && currentWeight && targetWeight < currentWeight;
  const isGaining = targetWeight && currentWeight && targetWeight > currentWeight;

  const handleSaveWeight = (e) => {
    e.preventDefault();
    if (!newWeight || parseFloat(newWeight) <= 0) return;
    onLogWeight?.(parseFloat(newWeight), note);
    setShowLogModal(false);
    setNewWeight('');
    setNote('');
  };

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-white/10 shadow-lg relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-500/20">
            <Scale size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Cân Nặng &amp; Mục Tiêu</h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              {isReadOnly ? `Theo dõi cân nặng của ${personName}` : 'Theo dõi xu hướng sức khỏe dài hạn'}
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
          >
            <Plus size={13} />
            <span>Ghi cân</span>
          </button>
        )}
      </div>

      {/* Main Metric Numbers */}
      {currentWeight ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
          {/* Hiện tại */}
          <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Hiện tại</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{currentWeight}</span>
              <span className="text-xs text-zinc-400">kg</span>
            </div>
            {profile?.weight_date && (
              <span className="text-[9px] text-zinc-500 mt-1">Đo: {profile.weight_date}</span>
            )}
          </div>

          {/* Mục tiêu */}
          <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Mục tiêu</span>
            {targetWeight ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-purple-300">{targetWeight}</span>
                <span className="text-xs text-zinc-400">kg</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenWizard}
                className="text-xs text-purple-400 hover:underline font-bold text-left mt-1"
              >
                + Đặt mục tiêu
              </button>
            )}
            {diff !== null && (
              <span className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${
                Math.abs(diff) < 0.2 ? 'text-emerald-400' : 'text-zinc-400'
              }`}>
                {isLosing ? <TrendingDown size={11} className="text-purple-400" /> : <TrendingUp size={11} className="text-emerald-400" />}
                {Math.abs(diff) < 0.2 ? 'Đạt mục tiêu! ✨' : `Còn ${Math.abs(diff)} kg`}
              </span>
            )}
          </div>

          {/* BMI */}
          {bmiInfo && (
            <div className="col-span-2 sm:col-span-1 p-3 bg-zinc-900/60 rounded-2xl border border-white/5 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">BMI Chuẩn Á</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{bmiInfo.bmi}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  bmiInfo.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {bmiInfo.category}
                </span>
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 truncate">{bmiInfo.description}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-700 text-center mb-3">
          <p className="text-xs text-zinc-400 mb-2">
            {isReadOnly ? `${personName} chưa ghi nhận thông tin cân nặng` : 'Chưa có thông tin cân nặng của bạn'}
          </p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={onOpenWizard}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all"
            >
              Thiết lập hồ sơ sức khỏe
            </button>
          )}
        </div>
      )}

      {/* Lịch sử gần nhất */}
      {weightLogs.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Lịch sử: {weightLogs.length} lần ghi nhận</span>
          <span className="text-[10px] text-zinc-500 italic">Đánh giá theo xu hướng dài hạn</span>
        </div>
      )}

      {/* MODAL GHI CÂN NẶNG */}
      {showLogModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs bg-zinc-950 border border-purple-500/30 rounded-[28px] p-5 shadow-2xl animate-scale-up text-zinc-100">
            <h4 className="text-sm font-black text-white mb-1">Ghi Nhận Cân Nặng</h4>
            <p className="text-xs text-zinc-400 mb-4">Cập nhật chỉ số cân nặng hôm nay</p>

            <form onSubmit={handleSaveWeight} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Cân nặng (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="vd: 56.2"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm font-bold focus:border-purple-400 focus:outline-none"
                    autoFocus
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="vd: Cân buổi sáng lúc mới ngủ dậy"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/25 transition-all"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
