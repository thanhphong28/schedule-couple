// components/Header.jsx
import { CalendarDays, Heart, LayoutDashboard, ListChecks, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatDate } from '../lib/utils.js';

const TABS = [
  { icon: CalendarDays, label: '📅 Lịch & Hôm Nay' },
  { icon: ListChecks, label: '📋 Kế Hoạch Tuần' },
  { icon: LayoutDashboard, label: '📊 Dashboard' },
];

export default function Header() {
  const { totalTasks, completedTasks, bothTasks, progressPct, activeTab, setActiveTab, isOnline } = useApp();

  const progressColor =
    progressPct >= 80 ? '#00B894' :
    progressPct >= 50 ? '#E27387' :
    '#FDCB6E';

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top Banner */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E27387 0%, #c95b72 40%, #a84560 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-5 text-center text-white">
          {/* Hearts */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <Heart size={14} fill="white" className="animate-heartbeat opacity-80" />
            <p className="text-xs sm:text-sm font-600 opacity-90 tracking-wide" style={{ fontFamily: 'Nunito' }}>
              {formatDate()}
            </p>
            <Heart size={14} fill="white" className="animate-heartbeat opacity-80" />
            {/* Sync status */}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-700"
              style={{ background: isOnline ? 'rgba(0,184,148,0.3)' : 'rgba(255,255,255,0.2)' }}
            >
              {isOnline
                ? <><Wifi size={10} /> Real-time</>
                : <><WifiOff size={10} /> Local</>}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-800 tracking-tight mb-1" style={{ fontFamily: 'Dancing Script, cursive' }}>
            ✨ SCHEDULE BELONG TO THI & PHONG ✨
          </h1>
          <p className="text-xs sm:text-sm opacity-85 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Nunito' }}>
            Cùng nhau lên kế hoạch, xây dựng từng thói quen nhỏ và tận hưởng trọn vẹn từng khoảnh khắc ngọt ngào 💕
          </p>
        </div>
      </div>

      {/* Scorecards */}
      <div className="px-3 py-3 sm:px-5 sm:py-4" style={{ background: 'linear-gradient(180deg, #fceef1, #fff8f5)' }}>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3">
          {/* Scorecard 1 */}
          <div className="scorecard bg-white shadow-sm text-center" style={{ border: '1.5px solid #fde4ea' }}>
            <div className="text-xl sm:text-2xl font-800" style={{ color: '#E27387' }}>{totalTasks}</div>
            <div className="text-xs text-gray-400 font-600 leading-tight">📌 Tổng việc</div>
          </div>
          {/* Scorecard 2 */}
          <div className="scorecard bg-white shadow-sm text-center" style={{ border: '1.5px solid #d4f5e3' }}>
            <div className="text-xl sm:text-2xl font-800 text-green-500">{completedTasks}</div>
            <div className="text-xs text-gray-400 font-600 leading-tight">✅ Hoàn thành</div>
          </div>
          {/* Scorecard 3 */}
          <div className="scorecard bg-white shadow-sm text-center" style={{ border: '1.5px solid #e8e0ff' }}>
            <div className="text-xl sm:text-2xl font-800" style={{ color: '#6C5CE7' }}>{bothTasks}</div>
            <div className="text-xs text-gray-400 font-600 leading-tight">💑 Cùng nhau</div>
          </div>
          {/* Scorecard 4 - Progress */}
          <div className="scorecard bg-white shadow-sm text-center" style={{ border: '1.5px solid #fde4ea' }}>
            <div className="text-xl sm:text-2xl font-800" style={{ color: progressColor }}>{progressPct}%</div>
            <div className="text-xs text-gray-400 font-600 leading-tight">📊 Tiến độ</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 px-0.5">
          <div className="flex justify-between text-xs text-gray-400 font-600 mb-1">
            <span>Tiến độ tuần này</span>
            <span style={{ color: progressColor }}>{completedTasks}/{totalTasks} việc hoàn thành</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${progressColor}aa, ${progressColor}, ${progressColor}aa)` }} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map((tab, i) => (
            <button
              key={i}
              className={`tab-btn ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
