// components/Header.jsx
import { Heart, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatDate } from '../lib/utils.js';

export default function Header() {
  const { isOnline } = useApp();

  return (
    <header className="relative w-full mb-2 pt-4 px-2 sm:px-4">
      {/* Container for the whole header area, using a very soft, seamless blur that fades out at the bottom */}
      <div className="absolute top-0 left-0 right-0 h-[180px] bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none -z-10" />

      {/* Top Banner (No heavy glass, just floating text) */}
      <div className="relative text-center text-white pb-2 pt-2">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, #E27387, #f4a5b5)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, #ffffff, #fceef1)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 flex flex-col items-center">
          {/* Hearts & Sync */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Heart size={14} fill="currentColor" className="animate-heartbeat text-pink-300" />
            <p className="text-xs sm:text-sm font-bold text-white/95 tracking-[0.2em] uppercase drop-shadow-md">
              {formatDate()}
            </p>
            <Heart size={14} fill="currentColor" className="animate-heartbeat text-pink-300" />
            {/* Sync status */}
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase ml-3 liquid-glass border border-white/20 shadow-sm"
              style={{ color: isOnline ? '#bbf7d0' : '#fbcfe8' }}
            >
              {isOnline
                ? <><Wifi size={10} /> Live</>
                : <><WifiOff size={10} /> Local</>}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-white drop-shadow-lg" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
            PHONG & THI
          </h1>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto leading-relaxed font-semibold drop-shadow-md">
            Cùng nhau lên kế hoạch, xây dựng thói quen và tận hưởng từng khoảnh khắc 💕
          </p>
        </div>
      </div>
    </header>
  );
}
