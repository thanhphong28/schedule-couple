import React, { useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// ---- Ambient Effects Components ----
const OceanEffects = () => {
  const bubbles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${3 + Math.random() * 8}s`,
    animationDelay: `${Math.random() * 5}s`,
    size: `${5 + Math.random() * 15}px`,
    opacity: Math.random() * 0.5 + 0.3
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* 🌊 SVG Water Distortion Filter for realistic water feel */}
      <svg width="0" height="0" className="absolute hidden">
        <filter id="water-distortion">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise">
            <animate attributeName="baseFrequency" values="0.015;0.02;0.015" dur="15s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </svg>
      
      {/* Light rays from top */}
      <div className="absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b from-cyan-200/20 to-transparent mix-blend-screen" 
           style={{ maskImage: 'repeating-linear-gradient(45deg, transparent, rgba(0,0,0,1) 5%, transparent 10%)', animation: 'aurora-shift 20s infinite alternate' }} />

      {/* Water layer that applies the distortion filter to things behind it (the background) */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-cyan-900/10 mix-blend-overlay" style={{ filter: 'url(#water-distortion)' }}></div>

      {/* Bubbles */}
      {bubbles.map(b => (
        <div 
          key={b.id}
          className="absolute bottom-[-10%] rounded-full bg-white backdrop-blur-md border border-white/40 animate-bubble shadow-[0_0_10px_rgba(255,255,255,0.4)]"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: b.opacity,
            animationDuration: b.animationDuration,
            animationDelay: b.animationDelay
          }}
        />
      ))}

      {/* 🦈 Realistic Shark */}
      <div className="absolute top-[20%] -left-[30%] opacity-60 animate-shark-swim" style={{ animationDuration: '30s' }}>
        <svg width="180" height="70" viewBox="0 0 100 40" fill="currentColor" className="text-slate-800 drop-shadow-2xl">
          {/* Shark Body */}
          <path d="M5,20 Q30,5 60,15 T95,20 Q60,30 30,25 T5,20 Z" />
          {/* Dorsal Fin */}
          <path d="M45,16 Q42,5 50,5 Q52,10 55,17 Z" />
          {/* Pectoral Fin */}
          <path d="M40,24 Q30,35 45,35 Q48,28 46,24 Z" />
          {/* Tail */}
          <path d="M10,20 Q0,5 5,5 Q5,20 0,35 Q10,35 10,20 Z" />
        </svg>
      </div>

      {/* 🐋 Majestic Whale */}
      <div className="absolute top-[55%] -left-[50%] opacity-40 animate-shark-swim" style={{ animationDuration: '45s', animationDelay: '15s' }}>
        <svg width="350" height="120" viewBox="0 0 100 40" fill="currentColor" className="text-cyan-950 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
          {/* Whale Body */}
          <path d="M15,20 Q40,0 80,15 T98,22 Q70,35 40,30 T15,20 Z" />
          {/* Flipper */}
          <path d="M45,28 Q35,40 50,42 Q55,35 52,28 Z" />
          {/* Tail */}
          <path d="M18,20 Q0,0 5,0 Q8,20 0,40 Q15,40 18,20 Z" />
        </svg>
      </div>
      
      {/* 🐟 School of Fish (More realistic shapes) */}
      <div className="absolute top-[35%] -left-[20%] opacity-80 animate-shark-swim" style={{ animationDuration: '22s', animationDelay: '5s' }}>
        {Array.from({length: 12}).map((_, i) => (
          <svg key={i} width="16" height="8" viewBox="0 0 20 10" fill="currentColor" 
               className="text-cyan-300 absolute drop-shadow-lg"
               style={{ top: `${Math.random() * 50}px`, left: `${Math.random() * 80}px`, opacity: Math.random() * 0.5 + 0.5 }}>
            <path d="M4,5 Q10,0 18,5 Q10,10 4,5 Z" />
            <path d="M5,5 L0,0 L0,10 Z" />
          </svg>
        ))}
      </div>
    </div>
  );
};

const AuroraEffects = () => {
  const stars = useMemo(() => Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDuration: `${1 + Math.random() * 4}s`,
    animationDelay: `${Math.random() * 5}s`,
    size: `${1 + Math.random() * 3}px`,
    opacity: Math.random() * 0.8 + 0.2
  })), []);

  const shootingStars = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 30}%`,
    left: `${Math.random() * 80 + 20}%`, // Start more towards the right
    animationDuration: `${3 + Math.random() * 8}s`,
    animationDelay: `${Math.random() * 15}s`,
    size: `${1 + Math.random() * 2}px`
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Aurora glow shifting dynamically */}
      <div className="absolute inset-0 opacity-60 mix-blend-screen" 
           style={{
             background: 'radial-gradient(ellipse at 40% -10%, rgba(16,185,129,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 40%, rgba(139,92,246,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 60%, rgba(59,130,246,0.3) 0%, transparent 60%)',
             backgroundSize: '200% 200%',
             filter: 'blur(30px)',
             animation: 'aurora-shift 15s infinite alternate ease-in-out'
           }}
      />
      
      {/* 🌟 Stars */}
      {stars.map(s => (
        <div 
          key={s.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDuration: s.animationDuration,
            animationDelay: s.animationDelay,
            boxShadow: `0 0 ${s.size} #fff`
          }}
        />
      ))}

      {/* ☄️ Shooting Stars (Very visible) */}
      {shootingStars.map(st => (
        <div 
          key={st.id} 
          className="absolute bg-gradient-to-t from-transparent via-white to-white -rotate-45"
          style={{ 
            top: st.top, 
            left: st.left, 
            width: st.size,
            height: '100px',
            opacity: 0, // Starts invisible, keyframe handles it
            animation: `shooting-star ${st.animationDuration} infinite ease-in`,
            animationDelay: st.animationDelay,
            boxShadow: '0 -2px 10px 2px rgba(255,255,255,1)', // Glowing head
            borderRadius: '50%'
          }} 
        />
      ))}
    </div>
  );
};

const WinterEffects = () => {
  const snowflakes = useMemo(() => Array.from({ length: 60 }).map((_, i) => {
    const chars = ['❄', '❅', '❆'];
    return {
      id: i,
      char: chars[Math.floor(Math.random() * chars.length)],
      left: `${Math.random() * 100}%`,
      animationDuration: `${5 + Math.random() * 12}s`,
      animationDelay: `${Math.random() * -15}s`,
      size: `${10 + Math.random() * 16}px`, // Text font size
      opacity: Math.random() * 0.7 + 0.3,
      blur: Math.random() > 0.6 ? '1.5px' : '0px'
    };
  }), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Frost edges */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(255,255,255,0.15)] pointer-events-none"></div>
      
      {/* ❄️ Realistic Snowflakes */}
      {snowflakes.map(s => (
        <div 
          key={s.id}
          className="absolute -top-[10%] text-white animate-snowfall drop-shadow-md leading-none"
          style={{
            left: s.left,
            fontSize: s.size,
            opacity: s.opacity,
            filter: `blur(${s.blur})`,
            animationDuration: s.animationDuration,
            animationDelay: s.animationDelay
          }}
        >
          {s.char}
        </div>
      ))}
    </div>
  );
};

const SurpriseEffects = () => {
  // Cyberpunk Neon City
  const rain = useMemo(() => Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${0.1 + Math.random() * 0.3}s`,
    animationDelay: `${Math.random() * 2}s`
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Glowing Grid */}
      <div className="absolute bottom-0 w-full h-[60%]"
           style={{
             backgroundImage: 'linear-gradient(to right, rgba(244, 63, 94, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(244, 63, 94, 0.25) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(0) translateZ(0)',
             transformOrigin: 'bottom',
             animation: 'grid-move 8s linear infinite'
           }}>
      </div>
      
      {/* Neon Atmospheric Glow */}
      <div className="absolute top-0 w-full h-[50%] bg-gradient-to-b from-[#f43f5e]/40 via-[#8b5cf6]/20 to-transparent mix-blend-screen"></div>
      
      {/* 🌧️ Cyber Rain */}
      {rain.map(r => (
        <div key={r.id} className="absolute -top-[10%] w-[1px] h-[40px] bg-gradient-to-b from-cyan-400/60 to-transparent"
             style={{
               left: r.left,
               animation: `snowfall ${r.animationDuration} linear infinite`,
               animationDelay: r.animationDelay
             }} />
      ))}

      {/* 🏎️ Holographic Flying Car */}
      <div className="absolute top-[35%] -left-[10%] opacity-80 animate-shark-swim" style={{ animationDuration: '6s', animationDelay: '1s' }}>
        <div className="w-[50px] h-[12px] bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_20px_#22d3ee]"></div>
        <div className="absolute top-[3px] left-[35px] w-[25px] h-[6px] bg-rose-500 rounded-full blur-[1px] shadow-[0_0_20px_#f43f5e]"></div>
      </div>
    </div>
  );
};

// ---- Main Theme System Component ----
export default function ThemeSystem() {
  const { themeId, wallpaper, WALLPAPERS } = useApp();

  // Inject Theme class into body so all UI components adapt
  useEffect(() => {
    document.body.className = `theme-${themeId}`;
  }, [themeId]);
  
  // Custom wallpaper logic
  let bgStyle = {};

  if (wallpaper) {
    const currentWp = WALLPAPERS.find(w => w.id === wallpaper);
    if (currentWp) {
      if (currentWp.url === 'aurora') {
        bgStyle = { background: 'radial-gradient(circle at 30% 30%, #f43f5e 0%, #8b5cf6 50%, #09090b 100%)' };
      } else {
        bgStyle = { backgroundImage: `url(${currentWp.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      }
    }
  } else {
    // Theme Defaults (Using High-Quality images saved in public/themes/)
    switch (themeId) {
      case 'ocean':
        bgStyle = { backgroundImage: 'url(/themes/ocean.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' };
        break;
      case 'aurora':
        bgStyle = { backgroundImage: 'url(/themes/aurora.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' };
        break;
      case 'winter':
        bgStyle = { backgroundImage: 'url(/themes/winter.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' };
        break;
      case 'surprise':
        bgStyle = { backgroundImage: 'url(/themes/surprise.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' };
        break;
      default:
        bgStyle = { background: '#09090b' };
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-50 transition-colors duration-1000">
      {/* 1. Base Background Image / Gradient */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={bgStyle}
      />
      
      {/* 2. Base Dim Scrim (ensures text legibility) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-all duration-1000"></div>

      {/* 3. Ambient Animations based on Theme */}
      <div className="absolute inset-0 z-0">
        {themeId === 'ocean' && <OceanEffects />}
        {themeId === 'aurora' && <AuroraEffects />}
        {themeId === 'winter' && <WinterEffects />}
        {themeId === 'surprise' && <SurpriseEffects />}
      </div>
    </div>
  );
}
