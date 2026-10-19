// components/health/WaterBottle.jsx
// Bình nước đôi với hiệu ứng sóng nước chuyển động liên tục và cảm giác fill nước chân thực
import { useState, useEffect, useRef, useMemo } from 'react';
import { Droplets, Sparkles, Check, Plus } from 'lucide-react';

export default function WaterBottle({
  name = 'Tôi',
  avatarUrl,
  currentAmount = 0,
  goalAmount = 2000,
  isMe = true,
  onQuickAdd,
  onViewHistory,
  themeColor = 'sky' // 'sky' | 'rose'
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((currentAmount / goalAmount) * 100)));
  const isCompleted = currentAmount >= goalAmount;
  const isNear = percentage >= 75 && !isCompleted;

  // Track biến động lượng nước để kích hoạt hiệu ứng "Rót nước vào bình" (Fill animation)
  const prevAmountRef = useRef(currentAmount);
  const [isFilling, setIsFilling] = useState(false);
  const [addedAmount, setAddedAmount] = useState(0);

  useEffect(() => {
    if (currentAmount > prevAmountRef.current) {
      const diff = currentAmount - prevAmountRef.current;
      setAddedAmount(diff);
      setIsFilling(true);

      const timer = setTimeout(() => {
        setIsFilling(false);
        setAddedAmount(0);
      }, 2000);

      prevAmountRef.current = currentAmount;
      return () => clearTimeout(timer);
    } else {
      prevAmountRef.current = currentAmount;
    }
  }, [currentAmount]);

  // Chiều cao mức nước trong SVG (bình có viewBox="0 0 110 220", thân bình chứa nước từ y=32 đến y=184, tổng chiều cao 152)
  const maxWaterHeight = 152;
  const waterHeight = Math.max(0, Math.min(maxWaterHeight, (percentage / 100) * maxWaterHeight));
  const waterY = 184 - waterHeight;

  // Unique IDs cho gradients & clips
  const idPrefix = useMemo(() => `bottle-${isMe ? 'me' : 'partner'}-${Math.random().toString(36).substring(2, 7)}`, [isMe]);

  const remaining = Math.max(0, goalAmount - currentAmount);

  return (
    <div className={`flex flex-col items-center flex-1 min-w-[145px] max-w-[210px] p-3 sm:p-3.5 rounded-[32px] transition-all duration-300 relative select-none ${
      isFilling ? 'animate-bottle-bounce' : ''
    } ${
      isCompleted 
        ? 'bg-gradient-to-b from-cyan-950/50 via-sky-950/30 to-zinc-900/80 border border-cyan-400/50 shadow-[0_12px_40px_rgba(6,182,212,0.25)]'
        : 'bg-zinc-900/70 border border-white/10 shadow-xl'
    }`}>
      {/* Hiệu ứng badge +...ml bay lên khi vừa rót nước */}
      {addedAmount > 0 && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 pointer-events-none z-30 animate-float-badge flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-zinc-950 font-black text-xs shadow-lg shadow-sky-500/50 border border-white/40 whitespace-nowrap">
          <Droplets size={13} className="fill-current text-zinc-950" />
          <span>+{addedAmount} ml nước lọc!</span>
        </div>
      )}

      {/* 1. Header: Avatar & Tên */}
      <div className="flex items-center gap-2 mb-2 w-full px-1">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={name} 
              className="w-8 h-8 rounded-full object-cover border-2 border-sky-400/60 shadow-sm"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-sm ${
              isMe ? 'bg-gradient-to-tr from-sky-500 to-cyan-400' : 'bg-gradient-to-tr from-rose-500 to-pink-400'
            }`}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          {isCompleted && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] ring-2 ring-zinc-950 font-bold">
              ✓
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white truncate">{name}</span>
            {isMe && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Bạn
              </span>
            )}
          </div>
          <span className={`text-[10px] font-medium block truncate ${isCompleted ? 'text-cyan-300 font-bold' : 'text-zinc-400'}`}>
            {isCompleted ? 'Đạt chuẩn 2L 🎉' : `${percentage}% (còn ${remaining}ml)`}
          </span>
        </div>
      </div>

      {/* 2. Visual Bottle Graphic (Bình nước kính sang trọng với sóng động liên tục) */}
      <div 
        onClick={onViewHistory}
        className="w-full relative flex items-center justify-center cursor-pointer group py-1 active:scale-95 transition-transform"
        title="Nhấn để xem chi tiết lịch sử uống nước"
      >
        <svg 
          viewBox="0 0 110 220" 
          className="w-full h-48 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] select-none overflow-visible"
        >
          <defs>
            {/* Gradient cho nước dâng lớp trước (Front wave) */}
            <linearGradient id={`${idPrefix}-gradFront`} x1="0%" y1="0%" x2="0%" y2="100%">
              {isCompleted ? (
                <>
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="1" />
                </>
              ) : isNear ? (
                <>
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.88" />
                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.98" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
                </>
              )}
            </linearGradient>

            {/* Gradient cho nước dâng lớp sau (Back wave) tạo chiều sâu 3D */}
            <linearGradient id={`${idPrefix}-gradBack`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.85" />
            </linearGradient>

            {/* Gradient luồng nước rót từ trên xuống (Pouring stream) */}
            <linearGradient id={`${idPrefix}-streamGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.95" />
            </linearGradient>

            {/* Khuôn cắt hình thân bình nước (Clip Path) */}
            <clipPath id={`${idPrefix}-clip`}>
              <rect x="20" y="32" width="70" height="152" rx="22" ry="22" />
            </clipPath>
          </defs>

          {/* Vỏ bình bên ngoài (Tritan/Glass bottle outline) */}
          <rect 
            x="18" y="30" width="74" height="156" rx="24" ry="24" 
            fill="rgba(255,255,255,0.03)" 
            stroke="rgba(255,255,255,0.22)" 
            strokeWidth="2"
            className="backdrop-blur-sm"
          />

          {/* Nắp bình thể thao (Sport cap & Ring handle) */}
          <g>
            {/* Vành cổ bình */}
            <rect x="34" y="24" width="42" height="7" rx="2.5" fill="#27272a" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            
            {/* Nắp vặn chính */}
            <rect x="37" y="14" width="36" height="12" rx="4" fill="#3f3f46" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
            
            {/* Khóa bật nắp (Push button) */}
            <rect x="49" y="16" width="12" height="6" rx="2" fill="#0284c7" />

            {/* Quai cầm xách tay (Carry handle loop) */}
            <path d="M 44 14 C 44 6, 66 6, 66 14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* NỘI DUNG CHẤT LỎNG NƯỚC (Bên trong khuôn cắt bình) */}
          <g clipPath={`url(#${idPrefix}-clip)`}>
            {/* Nhóm chất lỏng di chuyển mượt mà theo trục Y khi lượng nước thay đổi */}
            <g style={{ transform: `translateY(${waterY}px)`, transition: 'transform 0.8s cubic-bezier(0.34, 1.25, 0.64, 1)' }}>
              
              {/* Khối nước thân dưới */}
              <rect 
                x="15" 
                y="0" 
                width="80" 
                height="170" 
                fill={`url(#${idPrefix}-gradFront)`}
              />

              {/* Lớp sóng sau (Back Wave) - Chuyển động ngược chiều hoặc lệch pha */}
              {percentage > 0 && (
                <path 
                  d="M -60 0 Q -45 5, -30 0 T 0 0 T 30 0 T 60 0 T 90 0 T 120 0 T 150 0 T 180 0 V 170 H -60 Z" 
                  fill={`url(#${idPrefix}-gradBack)`}
                  className={isFilling ? "animate-wave-back-fast" : "animate-wave-back"}
                />
              )}

              {/* Lớp sóng trước (Front Wave) - Chuyển động sóng dập dềnh liên tục */}
              {percentage > 0 && (
                <path 
                  d="M -60 0 Q -45 -5, -30 0 T 0 0 T 30 0 T 60 0 T 90 0 T 120 0 T 150 0 T 180 0 V 170 H -60 Z" 
                  fill={`url(#${idPrefix}-gradFront)`}
                  className={isFilling ? "animate-wave-front-fast" : "animate-wave-front"}
                />
              )}

              {/* Viền sáng phản quang trên mặt sóng (Shimmering wave crest) */}
              {percentage > 0 && (
                <path 
                  d="M -60 0 Q -45 -5, -30 0 T 0 0 T 30 0 T 60 0 T 90 0 T 120 0 T 150 0 T 180 0" 
                  fill="none"
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.8"
                  className={isFilling ? "animate-wave-front-fast" : "animate-wave-front"}
                />
              )}

              {/* Bọt khí nước lơ lửng sủi tăm bên trong lòng nước */}
              {percentage > 8 && (
                <g opacity="0.8">
                  <circle cx="34" cy="45" r="2.2" fill="rgba(255,255,255,0.6)" className="animate-pulse" />
                  <circle cx="52" cy="75" r="3.2" fill="rgba(255,255,255,0.4)" className="animate-ping" style={{ animationDuration: '3s' }} />
                  <circle cx="68" cy="30" r="1.8" fill="rgba(255,255,255,0.7)" className="animate-pulse" style={{ animationDuration: '1.8s' }} />
                  <circle cx="44" cy="100" r="2.5" fill="rgba(255,255,255,0.5)" className="animate-bounce" style={{ animationDuration: '3.5s' }} />
                  <circle cx="62" cy="120" r="1.6" fill="rgba(255,255,255,0.6)" />
                </g>
              )}
            </g>

            {/* HIỆU ỨNG RÓT NƯỚC (Dòng nước chảy từ nắp vào bình khi vừa thêm nước) */}
            {isFilling && (
              <g>
                {/* Dòng nước rót từ cổ bình */}
                <line 
                  x1="55" y1="20" 
                  x2="55" y2={Math.min(180, waterY + 4)} 
                  stroke={`url(#${idPrefix}-streamGrad)`} 
                  strokeWidth="5" 
                  strokeLinecap="round" 
                  className="animate-water-stream"
                />
                <line 
                  x1="55" y1="20" 
                  x2="55" y2={Math.min(180, waterY + 4)} 
                  stroke="rgba(255,255,255,0.85)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  className="animate-water-stream"
                />

                {/* Gợn sóng & giọt bắn tại mặt nước nơi dòng nước chạm vào */}
                <g transform={`translate(55, ${waterY})`}>
                  <ellipse cx="0" cy="0" rx="12" ry="4" fill="rgba(255,255,255,0.85)" className="animate-splash-ripple" />
                  <circle cx="-6" cy="-4" r="2.2" fill="#7dd3fc" className="animate-splash-drop-l" />
                  <circle cx="7" cy="-5" r="2.5" fill="#38bdf8" className="animate-splash-drop-r" />
                </g>
              </g>
            )}

            {/* Ánh sáng bóng gương thủy tinh (Glass Reflection highlights) */}
            <path 
              d="M 25 38 Q 28 105, 28 174" 
              stroke="rgba(255,255,255,0.35)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d="M 31 42 Q 33 80, 33 110" 
              stroke="rgba(255,255,255,0.18)" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              fill="none" 
            />
          </g>

          {/* Vạch chia dung tích trên thân bình (Graduation marks) */}
          {/* 100% - 2000ml */}
          <line x1="72" y1="40" x2="82" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <text x="69" y="42" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="6" fontWeight="bold">2.0L</text>

          {/* 75% - 1500ml */}
          <line x1="72" y1="76" x2="82" y2="76" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <text x="69" y="78" textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="6">1.5L</text>

          {/* 50% - 1000ml */}
          <line x1="72" y1="112" x2="82" y2="112" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <text x="69" y="114" textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="6">1.0L</text>

          {/* 25% - 500ml */}
          <line x1="72" y1="148" x2="82" y2="148" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <text x="69" y="150" textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="6">0.5L</text>

          {/* Icon lấp lánh khi hoàn thành đủ 2L nước lọc */}
          {isCompleted && (
            <g transform="translate(43, 75)">
              <circle cx="12" cy="12" r="16" fill="rgba(14,165,233,0.3)" className="animate-ping" style={{ animationDuration: '2.5s' }} />
              <circle cx="12" cy="12" r="13" fill="rgba(255,255,255,0.2)" />
              <text x="12" y="17" textAnchor="middle" fontSize="16">✨</text>
            </g>
          )}
        </svg>

        {/* Badge trung tâm: Hiển thị lượng nước hiện tại */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`px-2.5 py-1.5 rounded-full backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition-all ${
            isCompleted 
              ? 'bg-cyan-950/80 border-cyan-400/40 text-cyan-200' 
              : 'bg-zinc-950/75 border-white/15 text-white'
          }`}>
            <Droplets size={12} className={isCompleted ? 'text-cyan-400 fill-cyan-400' : 'text-sky-400 fill-sky-400'} />
            <span className="text-xs font-black">{currentAmount.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400 font-semibold">/ {goalAmount.toLocaleString()} ml</span>
          </div>
        </div>
      </div>

      {/* 3. Nút Thêm Nước (Dành cho bình của tôi) hoặc Trạng thái người yêu */}
      {isMe ? (
        <button
          type="button"
          onClick={onQuickAdd}
          className="w-full mt-2.5 py-2.5 px-3 bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 hover:from-sky-400 hover:to-cyan-300 text-zinc-950 font-black text-xs rounded-2xl shadow-md shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 group"
        >
          <Plus size={15} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Rót nước lọc 💧</span>
        </button>
      ) : (
        <div className="w-full mt-2.5 py-2 px-3 bg-zinc-800/60 rounded-2xl text-center text-[11px] text-zinc-300 font-medium border border-white/5">
          {isCompleted ? 'Đã nạp đủ 2L nước lọc 💙' : 'Đang cố gắng uống đủ 🌿'}
        </div>
      )}
    </div>
  );
}
