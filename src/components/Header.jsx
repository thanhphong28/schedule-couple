// components/Header.jsx
import { createPortal } from 'react-dom';
import { Bell, Check, Heart, Image, Loader2, Palette, Trash2, Upload, Wifi, WifiOff, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { compressImage } from '../lib/utils.js';
function NotificationModal({ onClose }) {
  const { 
    notifPermission, 
    requestNotifPermission, 
    triggerTestNotification 
  } = useApp();

  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await triggerTestNotification();
    setTimeout(() => setTesting(false), 1200);
  };

  const content = (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="bottom-sheet flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-12 h-1.5 bg-zinc-600/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>🔔</span>
              <span>Thông báo nhắc nhở việc</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Nhắc trước 5 phút & đúng giờ cho 2 bạn</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[65dvh]">
          {/* Status Box */}
          <div className="p-3.5 rounded-2xl glass-panel border border-white/10 space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Trạng thái trên thiết bị này
            </div>
            
            {notifPermission === 'granted' && (
              <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đã bật thông báo hệ thống (Web Notifications)</span>
              </div>
            )}

            {notifPermission === 'default' && (
              <div className="space-y-2">
                <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-xl flex items-center justify-between">
                  <span>Chưa cấp quyền thông báo hệ thống</span>
                  <button
                    type="button"
                    onClick={requestNotifPermission}
                    className="px-3 py-1 rounded-lg text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-black shadow-sm active:scale-95"
                  >
                    Bật ngay 🔔
                  </button>
                </div>
              </div>
            )}

            {notifPermission === 'denied' && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 p-2.5 rounded-xl leading-relaxed">
                ⚠️ Trình duyệt đang chặn thông báo. Bạn có thể mở <b>Cài đặt trang web</b> của trình duyệt để Cho phép thông báo nhé.
              </div>
            )}

            {notifPermission === 'unsupported' && (
              <div className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/25 p-2.5 rounded-xl leading-relaxed">
                ℹ️ Trình duyệt này không hỗ trợ Web Notification API, nhưng bạn yên tâm: <b>Banner nổi & Chuông êm</b> vẫn luôn hiển thị trực tiếp khi mở app!
              </div>
            )}
          </div>

          {/* How Reminders Work */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              Cơ chế nhắc nhở tự động
            </div>
            
            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-black flex-shrink-0">
                ⏳
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-white">Nhắc trước 5 phút</div>
                <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                  Trước khi bắt đầu bất kỳ công việc nào 5 phút, chuông sẽ reo và gửi thông báo nhắc hai bạn chuẩn bị.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center text-sm font-black flex-shrink-0">
                ⏰
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-white">Nhắc đúng giờ</div>
                <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                  Đúng giờ bắt đầu, thông báo kèm nút "Đánh dấu hoàn thành ngay" để bạn tích xong trong 1 chạm.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center text-sm font-black flex-shrink-0">
                💬
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-white">Thông báo kép (Kèm chuông êm)</div>
                <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                  Phát âm thanh nhẹ nhàng + hiện banner nổi lướt từ đỉnh màn hình xuống (hoạt động kể cả khi máy không bật thông báo hệ thống).
                </div>
              </div>
            </div>
          </div>

          {/* Test Button Card */}
          <div className="pt-1">
            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>🧪</span>
              <span>{testing ? 'Đang gửi thông báo thử...' : 'Gửi thử thông báo mẫu ngay bây giờ'}</span>
            </button>
            <p className="text-[10px] text-zinc-400 text-center mt-1.5">
              Bấm để nghe thử chuông và xem thông báo mẫu trên màn hình
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex justify-end pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex-shrink-0">
          <button 
            type="button" 
            className="btn-primary w-full py-3" 
            onClick={onClose}
          >
            Đã hiểu ✨
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { isOnline } = useApp();
  const { user, partner } = useAuth();
  const [showNotifModal, setShowNotifModal] = useState(false);

  return (
    <header className="w-full pt-3 px-3 sm:px-4 pb-2">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-[20px] glass-panel border border-white/10 shadow-lg">
        {/* Couple Info */}
        <div className="flex items-center gap-2">
          {partner ? (
            <div className="flex items-center">
              {/* User 1 */}
              <div className="w-8 h-8 rounded-full border border-rose-400 bg-zinc-800 overflow-hidden flex items-center justify-center relative z-10 text-sm shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="User" /> : (user?.gender === 'MALE' ? '👦' : '👧')}
              </div>
              {/* Connecting Heart */}
              <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center -mx-1.5 z-20 backdrop-blur-md">
                <Heart size={10} className="text-rose-400 animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,1)]" fill="currentColor" />
              </div>
              {/* User 2 */}
              <div className="w-8 h-8 rounded-full border border-sky-400 bg-zinc-800 overflow-hidden flex items-center justify-center relative z-10 text-sm shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                {partner?.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover" alt="Partner" /> : (partner?.gender === 'MALE' ? '👦' : '👧')}
              </div>
              <div className="flex flex-col ml-2">
                <span className="text-[9px] font-black uppercase text-rose-300 tracking-wider">Không gian chung</span>
                <span className="text-[11px] font-extrabold text-white leading-tight truncate max-w-[120px]">
                  {user?.display_name} & {partner?.display_name}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border border-white/20 bg-zinc-800 overflow-hidden flex items-center justify-center text-sm shadow-md">
                {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="User" /> : (user?.gender === 'MALE' ? '👦' : '👧')}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Xin chào</span>
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">{user?.display_name || 'Bạn'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Info: Notifications & Live Status */}
        <div className="flex items-center gap-1.5">

          {/* Notification Button */}
          <button
            type="button"
            onClick={() => setShowNotifModal(true)}
            className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-300 hover:text-white border border-white/15 bg-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-sm"
            title="Cài đặt & thử thông báo nhắc việc"
          >
            <Bell size={13} className="text-amber-300" />
          </button>

          {/* Live Sync Badge */}
          <span 
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-colors ${
              isOnline 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi size={10} strokeWidth={2.5} /> Live
              </>
            ) : (
              <>
                <WifiOff size={10} strokeWidth={2.5} /> Local
              </>
            )}
          </span>
        </div>
      </div>

      {/* Gentle Subtitle Banner */}
      <div className="mt-2.5 px-3 py-1 text-center">
        <p className="text-[11px] font-medium text-zinc-300/90 leading-tight">
          Cùng nhau lên kế hoạch, xây dựng thói quen và tận hưởng từng khoảnh khắc 💕
        </p>
      </div>

      {showNotifModal && (
        <NotificationModal onClose={() => setShowNotifModal(false)} />
      )}
    </header>
  );
}
