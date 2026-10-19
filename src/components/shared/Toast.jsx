// components/shared/Toast.jsx
// Quản lý hệ thống thông báo Toast toàn cục
// - Tự động chống trùng lặp (deduplicate) thông báo giống nhau trong thời gian ngắn
// - Giới hạn tối đa 3 thông báo trên màn hình
// - Hỗ trợ chạm / click vào thông báo hoặc nút [X] để tắt ngay, không bao giờ bị đơ / kẹt
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Sparkles, Heart } from 'lucide-react';

export const showToast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && msg) {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type } }));
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const recentMessagesRef = useRef(new Map()); // Map<msg, timestamp>

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const handleToast = (e) => {
      const { msg, type = 'success' } = e.detail || {};
      if (!msg) return;

      const now = Date.now();
      const lastSeen = recentMessagesRef.current.get(msg);

      // Chống lặp: Nếu thông báo giống hệt vừa hiển thị trong vòng 2 giây thì bỏ qua
      if (lastSeen && now - lastSeen < 2000) {
        return;
      }
      recentMessagesRef.current.set(msg, now);

      // Dọn dẹp cache sau 5 giây
      setTimeout(() => {
        recentMessagesRef.current.delete(msg);
      }, 5000);

      const uniqueId = `${now}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast = { id: uniqueId, msg, type };

      setToasts(prev => {
        // Giữ tối đa 2 thông báo cũ + 1 mới để không tràn màn hình
        const trimmed = prev.slice(-2);
        return [...trimmed, newToast];
      });

      // Tự động tắt sau 3.5 giây
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== uniqueId));
      }, 3500);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-2 pointer-events-none w-[92%] max-w-sm"
    >
      {toasts.map(t => {
        const isError = t.type === 'error';
        const isInfo = t.type === 'info';

        return (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl border cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] active:scale-98 animate-slide-up ${
              isError
                ? 'bg-rose-500/95 border-rose-400/80 text-white shadow-rose-500/30'
                : isInfo
                ? 'bg-zinc-900/95 border-zinc-700/80 text-white shadow-zinc-950/50'
                : 'bg-pink-600/95 border-pink-400/80 text-white shadow-pink-500/30'
            }`}
            title="Nhấn để đóng thông báo"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-xl flex-shrink-0 drop-shadow-sm">
                {isError ? '🥺' : isInfo ? 'ℹ️' : '💘'}
              </span>
              <span className="text-xs sm:text-sm font-bold leading-snug break-words">
                {t.msg}
              </span>
            </div>

            {/* Nút đóng X tiện lợi */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
