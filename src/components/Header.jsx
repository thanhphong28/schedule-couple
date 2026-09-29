// components/Header.jsx
import { createPortal } from 'react-dom';
import { Bell, Check, Heart, Image, Loader2, Palette, Trash2, Upload, Wifi, WifiOff, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { compressImage } from '../lib/utils.js';

function WallpaperModal({ onClose }) {
  const { 
    wallpaper, 
    setWallpaper, 
    WALLPAPERS, 
    customWallpapers, 
    addCustomWallpaper, 
    deleteCustomWallpaper 
  } = useApp();

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedUrl = await compressImage(file, 1280, 1920, 0.82);
      let cleanName = file.name ? file.name.replace(/\.[^/.]+$/, '').trim() : '';
      if (!cleanName || /^(image|img[_\-]?\d+|photo)/i.test(cleanName)) {
        const d = new Date();
        cleanName = `Kỷ niệm ${d.getDate()}/${d.getMonth() + 1} 💕`;
      } else {
        cleanName = cleanName.slice(0, 24);
      }
      addCustomWallpaper({ name: cleanName, url: compressedUrl });
    } catch (err) {
      console.error('Lỗi upload ảnh:', err);
      alert('Không thể tải ảnh: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const presetList = WALLPAPERS.filter(w => !w.is_custom);
  const customList = customWallpapers || [];

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
              <span>🎨</span>
              <span>Không gian lãng mạn</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Chọn hoặc tải ảnh từ điện thoại của hai đứa</p>
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

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[65dvh]">
          
          {/* UPLOAD BUTTON CARD */}
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleUpload} 
              className="hidden" 
            />
            
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3.5 rounded-2xl border-2 border-dashed border-rose-500/40 hover:border-rose-400 bg-rose-500/10 hover:bg-rose-500/15 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-rose-400" />
                  <span className="text-xs font-bold text-rose-200">Đang nén & lưu ảnh của hai đứa... ✨</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Upload size={18} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>📸 Tải ảnh từ điện thoại lên</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/30 text-rose-200 font-extrabold uppercase">Mới</span>
                    </div>
                    <div className="text-[10px] text-zinc-300 mt-0.5">
                      Chọn ảnh chụp chung, đi chơi hoặc kỷ niệm từ thư viện
                    </div>
                  </div>
                </>
              )}
            </button>
          </div>

          {/* SECTION 1: CUSTOM WALLPAPERS (If any) */}
          {customList.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5 px-1">
                <span>💕</span>
                <span>Ảnh của hai đứa ({customList.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {customList.map((wp) => {
                  const isActive = wp.id === wallpaper;
                  return (
                    <div
                      key={wp.id}
                      onClick={() => setWallpaper(wp.id)}
                      className={`group relative rounded-2xl overflow-hidden border p-2.5 text-left cursor-pointer transition-all active:scale-95 flex flex-col justify-end min-h-[115px] ${
                        isActive
                          ? 'border-rose-400 ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                          : 'border-white/10 hover:border-white/30 bg-zinc-900/60'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div 
                        className="absolute inset-0 -z-10 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${wp.url})` }}
                      />
                      {/* Gradient Scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent -z-10" />

                      {/* Active Checkmark */}
                      {isActive && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      {/* Delete Custom Photo Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Xóa ảnh nền này khỏi danh sách?')) {
                            deleteCustomWallpaper(wp.id);
                          }
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-rose-500 text-zinc-300 hover:text-white transition-colors backdrop-blur-sm"
                        title="Xóa ảnh"
                      >
                        <Trash2 size={12} />
                      </button>

                      {/* Title */}
                      <div>
                        <div className="text-xs font-black text-white drop-shadow-md truncate">
                          {wp.name}
                        </div>
                        <div className="text-[9px] text-zinc-300 font-medium drop-shadow-sm mt-0.5">
                          Tải lên từ máy
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: PRESET WALLPAPERS */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-white flex items-center gap-1.5 px-1">
              <span>✨</span>
              <span>Bộ sưu tập mẫu lãng mạn</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {presetList.map((wp) => {
                const isActive = wp.id === wallpaper;
                const isAurora = wp.url === 'aurora';

                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setWallpaper(wp.id)}
                    className={`group relative rounded-2xl overflow-hidden border p-2.5 text-left transition-all active:scale-95 flex flex-col justify-end min-h-[110px] ${
                      isActive
                        ? 'border-rose-400 ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                        : 'border-white/10 hover:border-white/30 bg-zinc-900/60'
                    }`}
                  >
                    {/* Thumbnail Background */}
                    {isAurora ? (
                      <div 
                        className="absolute inset-0 -z-10"
                        style={{
                          background: 'radial-gradient(circle at 30% 30%, #f43f5e 0%, #8b5cf6 50%, #09090b 100%)'
                        }}
                      />
                    ) : (
                      <div 
                        className="absolute inset-0 -z-10 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${wp.url})` }}
                      />
                    )}

                    {/* Scrim Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent -z-10" />

                    {/* Active Checkmark */}
                    {isActive && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}

                    {/* Title & Desc */}
                    <div>
                      <div className="text-xs font-black text-white drop-shadow-md flex items-center gap-1">
                        {wp.name}
                      </div>
                      <div className="text-[10px] text-zinc-300/90 font-medium drop-shadow-sm mt-0.5">
                        {wp.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex justify-end pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] flex-shrink-0">
          <button 
            type="button" 
            className="btn-primary w-full py-3" 
            onClick={onClose}
          >
            Đã chọn xong ✨
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

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
            <p className="text-[11px] text-zinc-400 mt-0.5">Nhắc trước 5 phút & đúng giờ cho Phong & Thi</p>
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

export default function Header() {
  const { isOnline } = useApp();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  return (
    <header className="w-full pt-3 px-3 sm:px-4 pb-2">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between gap-2 py-1.5 px-3 rounded-[20px] glass-panel border border-white/10 shadow-lg">
        {/* Couple Pill */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-xs font-black text-rose-200">
            <span>👧</span>
            <span className="text-[11px] font-extrabold text-rose-300">Thi</span>
            <Heart size={11} fill="currentColor" className="text-rose-400 animate-heartbeat mx-0.5" />
            <span>👦</span>
            <span className="text-[11px] font-extrabold text-sky-300">Phong</span>
          </div>
        </div>

        {/* Right Info: Notifications, Theme Switcher & Live Status */}
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

          {/* Theme Palette Button */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm"
            title="Đổi hoặc tải hình nền"
          >
            <Palette size={11} className="text-rose-300" />
            <span>Đổi nền</span>
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

      {showThemeModal && (
        <WallpaperModal onClose={() => setShowThemeModal(false)} />
      )}

      {showNotifModal && (
        <NotificationModal onClose={() => setShowNotifModal(false)} />
      )}
    </header>
  );
}
