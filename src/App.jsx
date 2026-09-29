// App.jsx
import { useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Tab1Today from './components/tabs/Tab1Today.jsx';
import Tab2WeekPlan from './components/tabs/Tab2WeekPlan.jsx';
import Tab3Dashboard from './components/tabs/Tab3Dashboard.jsx';

function FloatingHeart({ x, delay }) {
  return (
    <span
      className="heart-particle"
      style={{ left: `${x}%`, animationDelay: `${delay}s`, fontSize: `${14 + Math.random() * 10}px` }}
    >
      💕
    </span>
  );
}

function AppContent() {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #fff8f5 0%, #fce4eb22 100%)' }}>
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto pb-10">
        {activeTab === 0 && <Tab1Today />}
        {activeTab === 1 && <Tab2WeekPlan />}
        {activeTab === 2 && <Tab3Dashboard />}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-300 font-600">
        Made with 💕 for Thi &amp; Phong • {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
