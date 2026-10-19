// components/health/HydrationCouple.jsx
// Hai bình nước — hai người yêu: Giao diện trực quan, đồng bộ thời gian thực
import { useState } from 'react';
import WaterBottle from './WaterBottle.jsx';
import WaterIntakeModal from './WaterIntakeModal.jsx';
import WaterHistoryModal from './WaterHistoryModal.jsx';
import WaterReminderModal from './WaterReminderModal.jsx';
import { Droplets, Bell, History, Heart, Sparkles, Send } from 'lucide-react';

export default function HydrationCouple({
  user,
  partner,
  myTodayWater,
  partnerTodayWater,
  myWaterGoal,
  partnerWaterGoal,
  myWaterLogs,
  partnerWaterLogs,
  myProfile,
  actions
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPartnerHistoryModal, setShowPartnerHistoryModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const myName = user?.display_name || user?.full_name || 'Tôi';
  const partnerName = partner?.display_name || partner?.full_name || 'Người yêu';

  const bothCompleted = myTodayWater >= myWaterGoal && partnerTodayWater >= partnerWaterGoal && partner?.id;

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-sky-500/20 shadow-[0_12px_40px_rgba(14,165,233,0.1)] relative overflow-hidden">
      {/* Glow gradient background */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/25">
            <Droplets size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              Hydration Couple
              <span className="text-xs">💧</span>
            </h3>
            <p className="text-[11px] text-sky-300 font-medium">Hai bình nước — cùng chăm sóc nhau</p>
          </div>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="p-2 text-zinc-400 hover:text-sky-300 bg-zinc-900/60 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5"
            title="Cài đặt nhắc uống nước"
          >
            <Bell size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="p-2 text-zinc-400 hover:text-sky-300 bg-zinc-900/60 hover:bg-zinc-800 rounded-xl transition-colors border border-white/5"
            title="Xem lịch sử uống nước"
          >
            <History size={15} />
          </button>
        </div>
      </div>

      {/* Banner Chúc mừng nếu cả hai hoàn thành */}
      {bothCompleted && (
        <div className="mb-3 p-3 bg-gradient-to-r from-sky-500/20 via-cyan-500/25 to-pink-500/20 border border-cyan-400/40 rounded-2xl flex items-center gap-2.5 animate-bounce shadow-md">
          <Sparkles className="text-cyan-300 flex-shrink-0" size={18} />
          <p className="text-xs text-cyan-100 font-bold leading-tight">
            🎉 Tuyệt vời! Cả hai bạn đều đã nạp đủ 2L nước lọc hôm nay! Khỏe mạnh & Tươi trẻ 💙
          </p>
        </div>
      )}

      {/* Thanh trạng thái chuẩn 2.000ml nước lọc */}
      <div className="mb-3 px-3 py-2 rounded-2xl bg-sky-500/10 border border-sky-400/15 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">💧</span>
          <span className="text-[11px] text-sky-200 font-medium">Chuẩn nước lọc:</span>
          <span className="text-[11px] font-black text-white">{myTodayWater.toLocaleString()} / {myWaterGoal.toLocaleString()} ml</span>
        </div>
        <span className="text-[10px] text-sky-300 font-bold bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
          Tối thiểu 2L/ngày 🎯
        </span>
      </div>

      {/* HAI BÌNH NƯỚC (BÌNH CỦA TÔI & BÌNH CỦA NGƯỜI YÊU) */}
      <div className="flex items-stretch justify-center gap-3 sm:gap-4 my-2">
        {/* Bình của tôi */}
        <WaterBottle
          name={myName}
          avatarUrl={user?.avatar_url}
          currentAmount={myTodayWater}
          goalAmount={myWaterGoal}
          isMe={true}
          onQuickAdd={() => setShowAddModal(true)}
          onViewHistory={() => setShowHistoryModal(true)}
          themeColor="sky"
        />

        {/* Bình của người yêu (hoặc ô mời kết nối nếu chưa ghép đôi) */}
        {partner?.id ? (
          <WaterBottle
            name={partnerName}
            avatarUrl={partner?.avatar_url}
            currentAmount={partnerTodayWater}
            goalAmount={partnerWaterGoal}
            isMe={false}
            onViewHistory={() => setShowPartnerHistoryModal(true)}
            themeColor="rose"
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 min-w-[145px] max-w-[210px] p-4 rounded-[32px] bg-zinc-900/40 border border-dashed border-zinc-700 text-center">
            <span className="text-3xl mb-2 opacity-60">🍶</span>
            <span className="text-xs font-bold text-zinc-300 mb-1">Bình của Người Ấy</span>
            <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
              Kết nối với người yêu để theo dõi bình nước cùng nhau nhé!
            </p>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 font-medium">
              Chờ ghép đôi 💌
            </span>
          </div>
        )}
      </div>

      {/* Nút gửi lời nhắn / Nudge người yêu uống nước */}
      {partner?.id && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Heart size={13} className="text-rose-400" />
            <span>Quan tâm nửa kia:</span>
          </div>
          <button
            type="button"
            onClick={() => actions.sendCheer('drink_water')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500/20 via-cyan-500/25 to-sky-500/20 hover:from-sky-500/30 hover:to-cyan-500/35 border border-sky-400/30 text-sky-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shadow-sky-500/10"
          >
            <Send size={12} className="text-sky-300" />
            <span>Rót nước cho {partnerName} 💧</span>
          </button>
        </div>
      )}

      {/* MODALS */}
      <WaterIntakeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddWater={actions.logWater}
      />

      <WaterHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Lịch Sử Uống Nước Của Bạn"
        logs={myWaterLogs}
        isEditable={true}
        onDeleteLog={actions.deleteWaterLog}
        onUpdateLog={actions.updateWaterLog}
      />

      {partner?.id && (
        <WaterHistoryModal
          isOpen={showPartnerHistoryModal}
          onClose={() => setShowPartnerHistoryModal(false)}
          title={`Lịch Sử Uống Nước của ${partnerName}`}
          logs={partnerWaterLogs}
          isEditable={false}
        />
      )}

      <WaterReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        initialSettings={myProfile || {}}
        onSaveSettings={actions.updateProfile}
      />
    </div>
  );
}
