// components/health/CalorieInsights.jsx
// Phân tích năng lượng cơ thể (BMR & TDEE theo Mifflin-St Jeor) và giải thích khoa học
import { Flame, Info, Sparkles, Activity, ShieldAlert } from 'lucide-react';
import { calculateAge, calculateBMR, calculateTDEE, ACTIVITY_MULTIPLIERS } from '../../services/healthPersonalization.js';

export default function CalorieInsights({ profile, userGender, activityData }) {
  const weight = profile?.current_weight ? parseFloat(profile.current_weight) : null;
  const height = profile?.height ? parseFloat(profile.height) : null;
  const age = calculateAge(profile?.birth_date);
  const activityLevel = profile?.activity_level || 'moderate';

  const bmr = calculateBMR(weight, height, age, userGender);
  const tdee = calculateTDEE(bmr, activityLevel);

  const activeCaloriesFromDevice = activityData?.calories_burned || null;

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-amber-500/20 shadow-lg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
          <Flame size={18} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Năng Lượng Tiêu Hao (Calo)</h3>
          <p className="text-[11px] text-zinc-400 font-medium">BMR cơ bản & TDEE ước tính hàng ngày</p>
        </div>
      </div>

      {bmr && tdee ? (
        <div className="space-y-3">
          {/* Grid 2 chỉ số chính: BMR & TDEE */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* BMR */}
            <div className="p-3 bg-zinc-900/70 rounded-2xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">BMR (Nghỉ ngơi)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-amber-300 font-semibold">Ước tính</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{bmr.toLocaleString()}</span>
                <span className="text-xs text-zinc-400">kcal/ngày</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                Năng lượng cơ thể cần để duy trì sự sống ngay cả khi nằm nghỉ.
              </p>
            </div>

            {/* TDEE */}
            <div className="p-3 bg-zinc-900/70 rounded-2xl border border-amber-500/30 flex flex-col justify-center bg-gradient-to-b from-amber-950/20 to-zinc-900/70">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">TDEE (Tổng ngày)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">Mức {ACTIVITY_MULTIPLIERS[activityLevel]?.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-300">{tdee.toLocaleString()}</span>
                <span className="text-xs text-zinc-400">kcal/ngày</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                Tổng năng lượng tiêu hao đã bao gồm sinh hoạt và vận động.
              </p>
            </div>
          </div>

          {/* Calo vận động từ thiết bị (nếu có) */}
          {activeCaloriesFromDevice !== null && (
            <div className="p-3 bg-zinc-900/50 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Calo vận động từ thiết bị</span>
                  <span className="text-[10px] text-zinc-400">Ghi nhận từ {activityData?.source || 'Smartwatch'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-400">+{activeCaloriesFromDevice}</span>
                <span className="text-[10px] text-zinc-400 ml-1">kcal</span>
              </div>
            </div>
          )}

          {/* Giải thích khoa học & Giới hạn công thức */}
          <div className="p-3 bg-zinc-900/40 rounded-2xl border border-white/5 text-[11px] text-zinc-400 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
              <Info size={12} className="text-amber-400" />
              <span>Cơ sở khoa học (Công thức Mifflin-St Jeor):</span>
            </div>
            <p>
              • BMR được tính dựa trên cân nặng ({weight}kg), chiều cao ({height}cm) và độ tuổi ({age} tuổi).
            </p>
            <p>
              • Đây là giá trị ước tính sinh học tham khảo, không đại diện cho lượng calo bắt buộc phải đốt cháy mỗi ngày.
            </p>
            <p>
              • ⚠️ Không nên ăn ít hơn mức BMR mà không có hướng dẫn từ chuyên gia dinh dưỡng.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-700 text-center">
          <p className="text-xs text-zinc-400 mb-1">
            Chưa đủ thông tin để tính BMR & TDEE
          </p>
          <p className="text-[10px] text-zinc-500 mb-3">
            Cần có: Chiều cao, cân nặng và ngày sinh trong hồ sơ sức khỏe.
          </p>
        </div>
      )}
    </div>
  );
}
