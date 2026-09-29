// components/shared/Badge.jsx
import { CATEGORIES, PERSONS, PRIORITY } from '../../data/initialTasks.js';

export function PersonBadge({ person }) {
  const p = PERSONS[person];
  if (!p) return null;

  const styleMap = {
    THI: 'bg-pink-500/15 text-pink-200 border-pink-500/30',
    PHONG: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
    BOTH: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  };

  const style = styleMap[person] || 'bg-white/10 text-white/80 border-white/20';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-sm ${style}`}>
      <span>{p.emoji}</span>
      <span>{p.label}</span>
    </span>
  );
}

export function CategoryBadge({ category }) {
  const c = CATEGORIES[category];
  if (!c) return null;

  return (
    <span 
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-sm"
      style={{
        backgroundColor: `${c.color}22`,
        color: '#FFFFFF',
        borderColor: `${c.color}55`
      }}
    >
      <span>{c.icon}</span>
      <span className="text-zinc-200">{c.label}</span>
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority];
  if (!p) return null;

  const dotColor = priority === 'HIGH' ? 'bg-rose-400' : priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400';
  const textColor = priority === 'HIGH' ? 'text-rose-200' : priority === 'MEDIUM' ? 'text-amber-200' : 'text-emerald-200';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 bg-white/5 backdrop-blur-md ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{p.label}</span>
    </span>
  );
}
