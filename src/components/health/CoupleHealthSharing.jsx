// components/health/CoupleHealthSharing.jsx
// Tương tác & Gửi động viên yêu thương tức thì giữa hai người
import { useState } from 'react';
import { Heart, Send, Sparkles } from 'lucide-react';

export default function CoupleHealthSharing({
  partner,
  onSendCheer
}) {
  const [customMsg, setCustomMsg] = useState('');
  const partnerName = partner?.display_name || partner?.full_name || 'Người yêu';

  const handleSendQuickCheer = (type, defaultText) => {
    onSendCheer?.(type, customMsg || defaultText);
    setCustomMsg('');
  };

  const handleSendCustom = (e) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    onSendCheer?.('custom', customMsg.trim());
    setCustomMsg('');
  };

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-pink-500/20 shadow-lg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5 px-1">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-md shadow-pink-500/20">
          <Heart size={18} className="text-white fill-white/20" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">Chăm Sóc & Động Viên Cặp Đôi</h3>
          <p className="text-[11px] text-zinc-400 font-medium">Gửi quan tâm và gắn kết sức khỏe cùng {partnerName}</p>
        </div>
      </div>

      {partner?.id ? (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-zinc-300 block">
            Gửi động viên 1-chạm tới {partnerName}:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSendQuickCheer('drink_water', `Nhớ uống một ly nước ấm nhé ${partnerName} ơi! 💧💕`)}
              className="p-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-2xl text-left transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="text-xl">💧</span>
              <div>
                <span className="text-xs font-bold text-white block">Nhắc uống nước</span>
                <span className="text-[10px] text-sky-300">Rót ly nước yêu thương</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendQuickCheer('hug', `Gửi tặng ${partnerName} một cái ôm ấm áp và tràn ngập năng lượng! 🧸💖`)}
              className="p-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-2xl text-left transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="text-xl">🧸</span>
              <div>
                <span className="text-xs font-bold text-white block">Tặng cái ôm</span>
                <span className="text-[10px] text-rose-300">Vỗ về & sưởi ấm</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendQuickCheer('workout', `Cùng nhau đứng dậy đi dạo hoặc vươn vai nhé ${partnerName}! 🏃‍♀️✨`)}
              className="p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-2xl text-left transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="text-xl">🏃</span>
              <div>
                <span className="text-xs font-bold text-white block">Cùng vận động</span>
                <span className="text-[10px] text-emerald-300">Duy trì lối sống khỏe</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSendQuickCheer('congrats', `Chúc mừng ${partnerName} đã rất nỗ lực vì sức khỏe hôm nay! Tự hào về BABI lắm! 🌟💙`)}
              className="p-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-2xl text-left transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="text-xl">🎉</span>
              <div>
                <span className="text-xs font-bold text-white block">Khen ngợi</span>
                <span className="text-[10px] text-amber-300">Tôn vinh nỗ lực hôm nay</span>
              </div>
            </button>
          </div>

          {/* Form gửi lời nhắn riêng */}
          <form onSubmit={handleSendCustom} className="pt-2 flex gap-2">
            <input
              type="text"
              placeholder={`Viết lời nhắn riêng gửi ${partnerName}...`}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!customMsg.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <Send size={12} />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="p-3 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 text-center">
          <p className="text-xs text-zinc-400">Hãy ghép đôi tài khoản để mở khóa tính năng chăm sóc đôi nhé!</p>
        </div>
      )}
    </div>
  );
}
