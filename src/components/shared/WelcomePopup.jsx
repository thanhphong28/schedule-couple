import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { COMPLIMENTS, LOVE_REMINDERS } from '../../data/quotes.js';

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState({});
  const { tasks } = useApp();

  useEffect(() => {
    // Only show once per session
    if (!sessionStorage.getItem('sc_welcome_shown')) {
      const today = new Date().getDay();
      const dayIdx = today === 0 ? 6 : today - 1; // Map Sun=0 to 6, Mon=1 to 0
      
      const uncompletedTasks = tasks.filter(t => t.day === dayIdx && !t.is_completed).length;
      
      setContent({
        compliment: COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)],
        love: LOVE_REMINDERS[Math.floor(Math.random() * LOVE_REMINDERS.length)],
        tasksLeft: uncompletedTasks
      });
      
      setIsOpen(true);
    }
  }, [tasks]);

  const handleStart = () => {
    sessionStorage.setItem('sc_welcome_shown', 'true');
    setIsOpen(false);
    
    // Request notification permission for the task reminders
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm liquid-glass-heavy rounded-[32px] p-6 border border-white/20 shadow-2xl animate-scaleIn text-center overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Decorative background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <button 
          onClick={handleStart}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="relative z-10 space-y-5 pt-4">
          <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-tr from-pink-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Sparkles className="text-white" size={32} />
          </div>

          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Chào ngày mới! ☀️</h2>
          
          <div className="space-y-3 text-sm font-600 text-white/90">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2">
              <p className="text-pink-200 italic font-bold">"{content.compliment}"</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-start gap-3 text-left">
              <Heart className="text-pink-400 mt-0.5 shrink-0 animate-pulse-pink" size={16} fill="currentColor" />
              <p className="leading-relaxed">{content.love}</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-start gap-3 text-left">
              <CheckCircle2 className="text-emerald-400 mt-0.5 shrink-0" size={16} />
              <p className="leading-relaxed text-white/80">
                {content.tasksLeft > 0 
                  ? <>Hôm nay bạn còn <b>{content.tasksLeft}</b> việc chưa làm. Cố gắng hoàn thành nhé! 💪</> 
                  : <>Tuyệt vời! Hôm nay bạn không còn việc nào tồn đọng! 🎉</>}
              </p>
            </div>
          </div>

          <button 
            onClick={handleStart} 
            className="w-full mt-2 py-4 liquid-glass border border-white/30 text-white font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-[0.98] uppercase tracking-widest text-xs shadow-lg"
          >
            Bắt đầu thôi! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
