// components/health/WaterIntakeModal.jsx
// Modal thêm lượng nước lọc tinh khiết với các nút chọn nhanh và nhập tùy chỉnh
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Droplets, X, Plus, Sparkles, Check, Info } from 'lucide-react';

const PRESET_AMOUNTS = [
  { amount: 150, label: '150 ml', icon: '💧', desc: 'Ngụm nước mát' },
  { amount: 250, label: '250 ml', icon: '🥛', desc: 'Cốc tiêu chuẩn' },
  { amount: 350, label: '350 ml', icon: '🥤', desc: 'Ly nước lớn' },
  { amount: 500, label: '500 ml', icon: '🍶', desc: 'Chai 500ml' },
  { amount: 750, label: '750 ml', icon: '🫙', desc: 'Bình lớn' }
];

function playWaterPourSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Giọt nước 1 (bọt nước nhẹ)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(350, now);
    osc1.frequency.exponentialRampToValueAtTime(750, now + 0.12);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Giọt nước 2 (rót nước đầy bình)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(950, now + 0.22);
    gain2.gain.setValueAtTime(0.16, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.22);
  } catch (e) {
    // Ignore audio context errors if blocked by browser
  }
}

export default function WaterIntakeModal({ isOpen, onClose, onAddWater }) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(250);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (amountToAdd) => {
    const val = parseInt(amountToAdd || customAmount || selectedPreset, 10);
    if (!val || val <= 0) return;

    setIsSubmitting(true);
    playWaterPourSound();
    
    // Ghi nhận nước lọc tinh khiết (không cần nhập ghi chú)
    onAddWater(val, 'Nước lọc tinh khiết');
    setIsSubmitting(false);
    onClose();
    setCustomAmount('');
  };

  const currentVal = customAmount ? parseInt(customAmount, 10) : selectedPreset;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-zinc-950 border border-sky-500/30 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_25px_60px_rgba(14,165,233,0.3)] animate-slide-up flex flex-col relative text-zinc-100">
        
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/30 ring-2 ring-sky-400/20">
            <Droplets size={22} className="text-white animate-bounce" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              Rót Nước Lọc Vào Bình
              <span className="text-xs">💧</span>
            </h3>
            <p className="text-xs text-sky-300 font-medium">Bổ sung nước lọc tinh khiết cho ngày khỏe khoắn</p>
          </div>
        </div>

        {/* Thông điệp chuẩn nước lọc 2L/ngày */}
        <div className="mb-4 p-2.5 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center gap-2">
          <Sparkles size={16} className="text-sky-300 flex-shrink-0 animate-pulse" />
          <p className="text-[11px] text-sky-200/90 leading-tight">
            <strong className="text-white font-bold">Chuẩn 2.000 ml/ngày:</strong> Giữ thói quen uống nước lọc đều đặn giúp thanh lọc cơ thể và làn da căng tràn sức sống!
          </p>
        </div>

        {/* Lựa chọn nhanh lượng nước lọc (Presets) */}
        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Chọn nhanh cốc nước lọc
        </label>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {PRESET_AMOUNTS.map((preset) => {
            const isSelected = selectedPreset === preset.amount && !customAmount;
            return (
              <button
                key={preset.amount}
                type="button"
                onClick={() => {
                  setSelectedPreset(preset.amount);
                  setCustomAmount('');
                }}
                className={`py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-b from-sky-500/30 to-cyan-500/20 border-sky-400 text-white font-black shadow-lg shadow-sky-500/25 scale-105 ring-1 ring-sky-400/50'
                    : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="text-base mb-0.5">{preset.icon}</span>
                <span className="text-[11px] font-bold">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Nhập dung tích tùy chỉnh */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
            Hoặc nhập lượng nước khác (ml)
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder={`Ví dụ: ${selectedPreset || 250}`}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                if (e.target.value) setSelectedPreset(null);
              }}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all font-semibold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
              ml nước lọc
            </span>
          </div>
        </div>

        {/* Nút xác nhận rót nước */}
        <button
          type="button"
          disabled={isSubmitting || (!currentVal || currentVal <= 0)}
          onClick={() => handleSubmit()}
          className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 hover:from-sky-400 hover:to-cyan-300 text-zinc-950 font-black text-sm rounded-2xl shadow-xl shadow-sky-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 group"
        >
          <Droplets size={18} className="fill-current group-hover:scale-110 transition-transform" />
          <span>Rót +{currentVal || 0} ml vào bình ngay 💧</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

