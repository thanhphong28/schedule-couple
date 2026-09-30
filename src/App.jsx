// App.jsx
import { useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import Tab1Today from './components/tabs/Tab1Today.jsx';
import Tab2WeekPlan from './components/tabs/Tab2WeekPlan.jsx';
import Tab3Dashboard from './components/tabs/Tab3Dashboard.jsx';
import Tab4Profile from './components/tabs/Tab4Profile.jsx';
import Tab5Health from './components/tabs/Tab5Health.jsx';
import AuthScreen from './components/auth/AuthScreen.jsx';
import { WelcomePopup } from './components/shared/WelcomePopup.jsx';
import { ToastContainer } from './components/shared/Toast.jsx';
import { Celebration } from './components/shared/Celebration.jsx';
import ThemeSystem from './components/theme/ThemeSystem.jsx';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarRange, Sparkles, User, HeartPulse, X } from 'lucide-react';

const TABS = [
  { id: 0, icon: CalendarDays, label: 'Hôm Nay', desc: 'Lịch & việc' },
  { id: 1, icon: CalendarRange, label: 'Cả Tuần', desc: 'Kế hoạch' },
  { id: 2, icon: Sparkles, label: 'Thống Kê', desc: 'Nhật ký & số liệu' },
  { id: 4, icon: HeartPulse, label: 'Chu Kỳ', desc: 'Chu kỳ & Couple Care' },
  { id: 3, icon: User, label: 'Hồ Sơ', desc: 'Cá nhân & Kết nối' },
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

      {/* GLOBAL THEME ENGINE (Background + Ambient Animations) */}
      <ThemeSystem />

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md md:max-w-xl mx-auto px-0 sm:px-2">
        <WelcomePopup />
        <Celebration />
        <Header />

        <main className="flex-1 w-full pb-28 pt-1">
          {activeTab === 0 && <Tab1Today />}
          {activeTab === 1 && <Tab2WeekPlan />}
          {activeTab === 2 && <Tab3Dashboard />}
          {activeTab === 4 && <Tab5Health />}
          {activeTab === 3 && <Tab4Profile />}
        </main>
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  if (!user) return <AuthScreen />;
  return <AppContent />;
}
