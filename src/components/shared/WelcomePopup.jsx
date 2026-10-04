// components/shared/WelcomePopup.jsx
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext.jsx';
import { X, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { COMPLIMENTS, LOVE_REMINDERS } from '../../data/quotes.js';
import { getDayIndex } from '../../lib/utils.js';

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState({ compliment: '', love: '', tasksLeft: 0 });
  const { tasks } = useApp();

  useEffect(() => {
    const checkAndShowPopup = () => {
      // Don't check if already open
      if (isOpen) return;

      const todayStr = new Date().toDateString();
      const lastShownDate = localStorage.getItem('sc_welcome_shown_date');
      const shownThisSession = sessionStorage.getItem('sc_welcome_shown_session');
      
      // Show if: (Not shown in this tab session) OR (It's a new day)
      if (!shownThisSession || lastShownDate !== todayStr) {
        const dayIdx = getDayIndex();
        const uncompletedTasks = tasks.filter(t => t.day === dayIdx && !t.is_completed).length;
        
        setContent({
          compliment: COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)],
          love: LOVE_REMINDERS[Math.floor(Math.random() * LOVE_REMINDERS.length)],
          tasksLeft: uncompletedTasks
        });
        
        setIsOpen(true);
      }
    };

    // Check immediately on mount (using setTimeout to ensure tasks are loaded if possible, but tasks dependency helps)
    checkAndShowPopup();

    // Check every time user brings the app back to foreground (from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndShowPopup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tasks, isOpen]);

  const handleStart = () => {
    sessionStorage.setItem('sc_welcome_shown_session', 'true');
    localStorage.setItem('sc_welcome_shown_date', new Date().toDateString());
    setIsOpen(false);
    
    // Request notification permission for task reminders
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  if (!isOpen) return null;

  const contentPopup = (
    <div className="modal-overlay" onClick={handleStart}>
      <div 
        className="w-full max-w-sm glass-panel-elevated rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/20 shadow-2xl animate-slide-up text-center overflow-hidden relative mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle romantic ambient lighting */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Drag handle for mobile */}
        <div className="pb-2 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
        </div>

        {/* Close Button */}
        <button 
          type="button"
          onClick={handleStart}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-90 z-10"
          aria-label="Đóng"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="relative z-10 space-y-4 pt-2">
          {/* Avatar Capsule -> 3D Logo */}
          <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-tr from-rose-500 to-pink-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] mb-2 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <Heart size={40} className="text-white animate-heartbeat" fill="currentColor" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Chào ngày mới! ☀️</h2>
          </div>
          
          <div className="space-y-2.5 text-xs text-zinc-200">
            {/* Compliment */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <p className="text-rose-200 italic font-bold">"{content.compliment}"</p>
            </div>

            {/* Love Reminder */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-start gap-2.5 text-left">
              <Heart className="text-rose-400 mt-0.5 shrink-0 animate-heartbeat" size={15} fill="currentColor" />
              <p className="leading-relaxed">{content.love}</p>
            </div>

            {/* Tasks Summary */}
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center gap-2.5 text-left">
              <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />
              <p className="leading-tight text-zinc-300">
                {content.tasksLeft > 0 
                  ? <>Hôm nay có <b>{content.tasksLeft}</b> việc cần làm. Cùng cố gắng nhé! 💪</> 
                  : <>Tuyệt vời! Hôm nay đã hoàn thành hết việc! 🎉</>}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleStart} 
            className="w-full btn-primary py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30"
          >
            Bắt đầu ngày mới ✨
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(contentPopup, document.body) : contentPopup;
}
