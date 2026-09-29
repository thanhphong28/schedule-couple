// components/shared/Badge.jsx
import { CATEGORIES, PERSONS, PRIORITY } from '../../data/initialTasks.js';

export function PersonBadge({ person }) {
  const p = PERSONS[person];
  if (!p) return null;
  return (
    <span className="badge" style={{ background: p.bg, color: p.color }}>
      {p.emoji} {p.label}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const c = CATEGORIES[category];
  if (!c) return null;
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      {c.icon} {c.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY[priority];
  if (!p) return null;
  const dots = { HIGH: '●●●', MEDIUM: '●●○', LOW: '●○○' };
  return (
    <span className="badge" style={{ background: p.bg, color: p.color }}>
      {dots[priority]} {p.label}
    </span>
  );
}
