// components/health/CycleHealthCard.jsx
// Tích hợp dữ liệu chu kỳ kinh nguyệt với tab Sức khỏe thông minh
import { HeartPulse, Droplets, Activity, Utensils, Sparkles, ChevronRight, Info } from 'lucide-react';
import { getContextualHealthInsights } from '../../services/healthPersonalization.js';

export default function CycleHealthCard({
  user,
  partner,
  isFemale,
  cycleInsight,
  waterStats,
  activityData,
  profile,
  onNavigateToCycleTab
}) {
  const insights = getContextualHealthInsights({
    user,
    partner,
    isFemale,
    cycleInsight,
    waterStats,
    activityData,
    profile
  });

  if (!cycleInsight && !isFemale && !partner?.id) {
    return null;
  }

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-rose-500/25 shadow-[0_10px_35px_rgba(244,63,94,0.1)] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header Card */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/25">
            <HeartPulse size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{insights.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {insights.statusBadge}
              </span>
              {insights.cycleDay && (
                <span className="text-[10px] text-zinc-300 font-semibold px-1.5 py-0.5 bg-white/5 rounded-full">
                  Ngày thứ {insights.cycleDay}
                </span>
              )}
              {insights.daysUntilPeriod !== null && (
                <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  Còn ~{insights.daysUntilPeriod} ngày đến kỳ
                </span>
              )}
            </div>
          </div>
        </div>

        {onNavigateToCycleTab && (
          <button
            type="button"
            onClick={onNavigateToCycleTab}
            className="p-1.5 text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-0.5 text-xs font-bold flex-shrink-0"
            title="Xem chi tiết lịch chu kỳ"
          >
            <span>{insights.hasCycleData ? 'Lịch' : 'Cập nhật'}</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Lời nhắn động viên chính */}
      <div className="p-3 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-zinc-900/60 border border-rose-500/20 rounded-2xl mb-3.5">
        <p className="text-xs text-rose-100 font-medium leading-relaxed">
          {insights.careNote}
        </p>
      </div>

      {/* 3 Khối gợi ý liên kết: Uống nước - Vận động - Dinh dưỡng */}
      <div className="space-y-2 text-xs">
        {/* 1. Gợi ý Uống nước theo chu kỳ */}
        <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Droplets size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-sky-300 block mb-0.5">Bù nước phù hợp</span>
            <p className="text-[11px] text-zinc-300 leading-snug">{insights.hydrationTip}</p>
          </div>
        </div>

        {/* 2. Gợi ý Vận động */}
        <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Activity size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-emerald-300 block mb-0.5">Vận động thể chất</span>
            <p className="text-[11px] text-zinc-300 leading-snug">{insights.workoutTip}</p>
          </div>
        </div>

        {/* 3. Dinh dưỡng & Chăm sóc */}
        <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Utensils size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-amber-300 block mb-0.5">Dinh dưỡng & Năng lượng</span>
            <p className="text-[11px] text-zinc-300 leading-snug">{insights.nutritionTip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
