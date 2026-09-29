// App.jsx
import { useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Tab1Today from './components/tabs/Tab1Today.jsx';
import Tab2WeekPlan from './components/tabs/Tab2WeekPlan.jsx';
import Tab3Dashboard from './components/tabs/Tab3Dashboard.jsx';
import { WelcomePopup } from './components/shared/WelcomePopup.jsx';
import { CalendarDays, ListChecks, LayoutDashboard } from 'lucide-react';

const TABS = [
  { icon: CalendarDays, label: 'Hôm Nay' },
  { icon: ListChecks, label: 'Tuần' },
  { icon: LayoutDashboard, label: 'Dashboard' },
];

function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto liquid-glass-heavy rounded-[32px] p-2 flex items-center justify-between border border-white/20 shadow-2xl pointer-events-auto">
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={i}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-white/20 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]' 
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              onClick={() => setActiveTab(i)}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppContent() {
  const { activeTab } = useApp();

  return (
    <div 
      className="min-h-screen flex flex-col relative pb-24" 
      style={{ 
        backgroundImage: 'url(/bg.jpg)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundAttachment: 'fixed' 
      }}
    >
      {/* Soft warm overlay to make background look dreamy, not pitch black */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-900/20 backdrop-blur-[3px] pointer-events-none"></div>
      
      <div className="relative z-10 flex-1 flex flex-col">
        <WelcomePopup />
        <Header />

        <main className="flex-1 max-w-3xl w-full mx-auto">
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
