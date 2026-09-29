// App.jsx
import { useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Tab1Today from './components/tabs/Tab1Today.jsx';
import Tab2WeekPlan from './components/tabs/Tab2WeekPlan.jsx';
import Tab3Dashboard from './components/tabs/Tab3Dashboard.jsx';
import { WelcomePopup } from './components/shared/WelcomePopup.jsx';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarRange, Sparkles, X } from 'lucide-react';

const TABS = [
  { id: 0, icon: CalendarDays, label: 'Hôm Nay', desc: 'Lịch & việc' },
  { id: 1, icon: CalendarRange, label: 'Cả Tuần', desc: 'Kế hoạch' },
  { id: 2, icon: Sparkles, label: 'Thống Kê', desc: 'Nhật ký & số liệu' },
];

function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav 
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 pointer-events-none"
    >
      <div className="max-w-md mx-auto glass-dock rounded-[28px] p-1.5 flex items-center justify-between pointer-events-auto shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-[22px] transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Active Pill Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/25 via-pink-500/20 to-rose-500/25 border border-rose-500/35 rounded-[22px] shadow-[0_0_16px_rgba(244,63,94,0.35)] -z-10 animate-fade-in" />
              )}

              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5 text-rose-400' : 'text-zinc-400'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[11px] tracking-wide mt-1 transition-colors ${isActive ? 'text-white font-black' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function InAppNotificationBanner() {
  const { activeNotification, dismissNotification, toggleTask } = useApp();

  if (!activeNotification) return null;

  const content = (
    <div className="fixed top-3 left-3 right-3 z-[99999] max-w-md mx-auto pointer-events-auto animate-slide-down">
      <div className="glass-panel border-2 border-rose-400/50 bg-zinc-950/95 shadow-[0_16px_40px_rgba(244,63,94,0.4)] rounded-2xl p-3.5 flex items-start gap-3 backdrop-blur-xl">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 shadow-md ${
          activeNotification.isDue 
            ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/30 animate-bounce' 
            : 'bg-gradient-to-tr from-rose-500 to-pink-500 shadow-rose-500/30 animate-pulse'
        }`}>
          {activeNotification.isDue ? '⏰' : '⏳'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-white truncate drop-shadow-sm">
              {activeNotification.title}
            </span>
            <button 
              type="button"
              onClick={dismissNotification}
              className="p-1 text-zinc-400 hover:text-white rounded-full transition-colors flex-shrink-0"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
            {activeNotification.body}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            {activeNotification.taskId && activeNotification.isDue && (
              <button
                type="button"
                onClick={() => {
                  toggleTask(activeNotification.taskId);
                  dismissNotification();
                }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all active:scale-95"
              >
                Đánh dấu xong ngay ✨
              </button>
            )}
            <button
              type="button"
              onClick={dismissNotification}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white/10 hover:bg-white/20 text-zinc-200 transition-all active:scale-95"
            >
              Đã hiểu 💕
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

function AppContent() {
  const { activeTab, wallpaper, WALLPAPERS } = useApp();
  const currentWp = WALLPAPERS?.find(w => w.id === wallpaper) || WALLPAPERS?.[0];
  const isAurora = !currentWp || currentWp.url === 'aurora';

  return (
    <div className="min-h-[100dvh] flex flex-col relative text-zinc-100 overflow-x-hidden">
      {/* 0. Real-time In-App Floating Notification Banner */}
      <InAppNotificationBanner />

      {/* 1. Background Layer: Image or Aurora */}
      {isAurora ? (
        <div 
          className="fixed inset-0 pointer-events-none z-0 transition-all duration-700 ease-out"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 15% 10%, rgba(244, 63, 94, 0.40) 0%, transparent 65%),
              radial-gradient(ellipse 65% 45% at 85% 20%, rgba(139, 92, 246, 0.35) 0%, transparent 60%),
              radial-gradient(ellipse 55% 45% at 10% 60%, rgba(14, 165, 233, 0.25) 0%, transparent 55%),
              radial-gradient(ellipse 75% 55% at 85% 85%, rgba(251, 113, 133, 0.35) 0%, transparent 65%),
              #09090b
            `
          }}
        />
      ) : (
        <div 
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-700 ease-out"
          style={{ 
            backgroundImage: `url(${currentWp.url})`,
            backgroundPosition: 'center center'
          }}
        />
      )}

      {/* 2. Soft Romantic Scrim Overlay (Translucent so wallpaper is clearly visible) */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/25 via-black/40 to-black/65 pointer-events-none z-0" />
      
      {/* 3. Floating subtle star sparkles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[12%] left-[15%] w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_#fff]" />
        <div className="absolute top-[26%] right-[18%] w-2 h-2 rounded-full bg-rose-300 animate-ping shadow-[0_0_10px_#fb7185]" style={{ animationDuration: '3s' }} />
        <div className="absolute top-[42%] left-[25%] w-1 h-1 rounded-full bg-sky-300 animate-pulse" />
        <div className="absolute top-[68%] right-[22%] w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[82%] left-[12%] w-2 h-2 rounded-full bg-pink-400 animate-ping shadow-[0_0_10px_#f472b6]" style={{ animationDuration: '5s' }} />
      </div>

      {/* 4. Main Mobile App Frame */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md md:max-w-xl mx-auto px-0 sm:px-2">
        <WelcomePopup />
        <Header />

        <main className="flex-1 w-full pb-28 pt-1">
          {activeTab === 0 && <Tab1Today />}
          {activeTab === 1 && <Tab2WeekPlan />}
          {activeTab === 2 && <Tab3Dashboard />}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
