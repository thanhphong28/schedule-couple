import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const showToast = (msg, type = 'success') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type } }));
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { msg, type } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`p-4 rounded-[20px] shadow-2xl flex items-center gap-3 pointer-events-auto backdrop-blur-xl border ${
          t.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
          t.type === 'success' ? 'bg-pink-500/90 border-pink-400 text-white' : 
          'bg-zinc-800/90 border-zinc-600 text-white'
        } transition-all duration-300 animate-slide-up`}>
          <span className="text-2xl drop-shadow-md">
            {t.type === 'error' ? '🥺' : t.type === 'success' ? '💘' : '✨'}
          </span>
          <span className="text-sm font-bold leading-tight">{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
