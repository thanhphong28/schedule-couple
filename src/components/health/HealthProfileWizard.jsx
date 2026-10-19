// components/health/HealthProfileWizard.jsx
// Quy trình thiết lập hồ sơ sức khỏe cá nhân từng bước (Step-by-step Wizard)
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, ArrowRight, ArrowLeft, Check, Sparkles, X, Target, Droplets, Activity } from 'lucide-react';
import { estimateRecommendedWater, ACTIVITY_MULTIPLIERS } from '../../services/healthPersonalization.js';

export default function HealthProfileWizard({
  isOpen,
  onClose,
  initialData = {},
  onSave
}) {
  const [step, setStep] = useState(1);
  const [height, setHeight] = useState(initialData.height || '');
  const [weight, setWeight] = useState(initialData.current_weight || '');
  const [targetWeight, setTargetWeight] = useState(initialData.target_weight || '');
  const [birthDate, setBirthDate] = useState(initialData.birth_date || '');
  const [activityLevel, setActivityLevel] = useState(initialData.activity_level || 'moderate');
  const [healthGoal, setHealthGoal] = useState(initialData.health_goal || 'maintain');
  const [waterGoal, setWaterGoal] = useState(initialData.daily_water_goal || 2000);

  if (!isOpen) return null;

  // Tự động gợi ý mục tiêu nước khi nhập cân nặng
  const handleWeightChange = (val) => {
    setWeight(val);
    if (val && parseFloat(val) > 0) {
      const rec = estimateRecommendedWater(parseFloat(val), activityLevel);
      setWaterGoal(rec);
    }
  };

  const handleFinish = () => {
    onSave?.({
      height: height ? parseFloat(height) : null,
      current_weight: weight ? parseFloat(weight) : null,
      target_weight: targetWeight ? parseFloat(targetWeight) : null,
      birth_date: birthDate || null,
      activity_level: activityLevel,
      health_goal: healthGoal,
      daily_water_goal: parseInt(waterGoal, 10) || 2000
    });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border border-emerald-500/30 rounded-[32px] p-5 sm:p-6 shadow-[0_25px_60px_rgba(16,185,129,0.2)] animate-slide-up flex flex-col relative text-zinc-100">
        
        {/* Nút đóng / Bỏ qua */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-white/10 transition-colors"
          title="Đóng / Bỏ qua"
        >
          <X size={16} />
        </button>

        {/* Header Steps Progress */}
        <div className="mb-5 pr-8">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Bước {step} / 4
          </span>
          <h3 className="text-lg font-black text-white mt-0.5">
            {step === 1 && 'Thông tin cơ bản'}
            {step === 2 && 'Cân nặng & Mục tiêu'}
            {step === 3 && 'Mức độ vận động & Uống nước'}
            {step === 4 && 'Xác nhận hồ sơ'}
          </h3>
        </div>

        {/* STEP 1: Chiều cao & Ngày sinh */}
        {step === 1 && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Chiều cao của bạn (cm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ví dụ: 165"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-400 focus:outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  cm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Ngày sinh (để ước tính độ tuổi & BMR)
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-400 focus:outline-none font-bold"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Thông tin này hoàn toàn riêng tư và không bắt buộc.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Cân nặng hiện tại & Mục tiêu */}
        {step === 2 && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Cân nặng hiện tại (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ví dụ: 55.5"
                  value={weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-400 focus:outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Cân nặng mục tiêu mong muốn (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ví dụ: 52.0"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-400 focus:outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  kg
                </span>
              </div>
            </div>

            {weight && targetWeight && (
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-emerald-300 flex items-center justify-between">
                <span>Chênh lệch mục tiêu:</span>
                <span className="font-bold">
                  {parseFloat(targetWeight) > parseFloat(weight) ? '+' : ''}
                  {(parseFloat(targetWeight) - parseFloat(weight)).toFixed(1)} kg
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Mức độ vận động & Uống nước */}
        {step === 3 && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Mức độ hoạt động thể chất
              </label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActivityLevel(key);
                      if (weight) setWaterGoal(estimateRecommendedWater(parseFloat(weight), key));
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      activityLevel === key
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-zinc-900/70 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[10px] text-zinc-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Mục tiêu uống nước hàng ngày (ml)</span>
                <span className="text-[10px] text-sky-400 font-semibold">Ước tính theo thể trạng</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:border-emerald-400 focus:outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  ml / ngày
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Tóm tắt & Xác nhận */}
        {step === 4 && (
          <div className="space-y-3 mb-6">
            <div className="p-4 bg-zinc-900/70 rounded-2xl border border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Chiều cao:</span>
                <span className="font-bold text-white">{height ? `${height} cm` : 'Chưa nhập'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Cân nặng hiện tại:</span>
                <span className="font-bold text-white">{weight ? `${weight} kg` : 'Chưa nhập'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Mục tiêu cân nặng:</span>
                <span className="font-bold text-emerald-400">{targetWeight ? `${targetWeight} kg` : 'Duy trì'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                <span className="text-zinc-400">Vận động:</span>
                <span className="font-bold text-white">{ACTIVITY_MULTIPLIERS[activityLevel]?.label}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">Mục tiêu nước:</span>
                <span className="font-black text-sky-400">{waterGoal} ml / ngày</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed text-center px-2">
              Bạn luôn có thể chỉnh sửa lại các thông số này bất kỳ lúc nào trong phần cài đặt sức khỏe.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={15} />
              <span>Quay lại</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 font-bold text-xs rounded-2xl transition-colors"
            >
              Bỏ qua
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Tiếp theo</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Check size={16} strokeWidth={3} />
              <span>Hoàn tất & Lưu hồ sơ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
