// components/health/WaterReminderModal.jsx
// Cấu hình nhắc uống nước thông minh cho từng người dùng
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Clock, ShieldCheck, X, Check } from 'lucide-react';
import { showToast } from '../shared/Toast.jsx';

export default function WaterReminderModal({
  isOpen,
  onClose,
  initialSettings = {},
  onSaveSettings
}) {
  const [enabled, setEnabled] = useState(initialSettings.water_reminder_enabled ?? true);
  const [startTime, setStartTime] = useState(initialSettings.water_reminder_start || '08:00');
  const [endTime, setEndTime] = useState(initialSettings.water_reminder_end || '21:00');
  const [intervalMins, setIntervalMins] = useState(initialSettings.water_reminder_interval || 90);
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  if (!isOpen) return null;

  const handleRequestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          showToast('Đã cấp quyền thông báo trình duyệt! 🔔', 'success');
          new Notification('Couple Schedule 💙', {
            body: 'Tính năng nhắc uống nước thông minh đã được bật!',
            icon: '/icon.png'
          });
        } else {
          showToast('Quyền thông báo chưa được cấp phép.', 'info');
        }
      } catch (e) {
        console.warn('Lỗi xin quyền notification:', e);
      }
    } else {
      showToast('Trình duyệt hiện tại không hỗ trợ Web Notification.', 'info');
    }
  };

  const handleSave = () => {
    onSaveSettings?.({
      water_reminder_enabled: enabled,
      water_reminder_start: startTime,
      water_reminder_end: endTime,
      water_reminder_interval: parseInt(intervalMins, 10)
    });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-950 border border-sky-500/30 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_25px_60px_rgba(14,165,233,0.25)] animate-slide-up flex flex-col relative text-zinc-100">
        
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Nhắc Uống Nước</h3>
            <p className="text-xs text-sky-300 font-medium">Cấu hình thời gian & chu kỳ nhắc</p>
          </div>
        </div>

        {/* Bật / Tắt nhắc nhở */}
        <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-white/10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {enabled ? <Bell className="text-sky-400" size={18} /> : <BellOff className="text-zinc-500" size={18} />}
            <div>
              <span className="text-xs font-bold text-white block">Nhắc nhở đều đặn</span>
              <span className="text-[10px] text-zinc-400">Tự động ngưng khi đã uống đủ</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              enabled ? 'bg-sky-500' : 'bg-zinc-700'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {enabled && (
          <div className="space-y-4 mb-5">
            {/* Khung giờ bắt đầu & kết thúc (Không làm phiền khi ngủ) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Bắt đầu
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Kết thúc
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Khoảng cách giữa các lần nhắc */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">
                Khoảng cách mỗi lần nhắc
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mins: 60, label: '60 phút' },
                  { mins: 90, label: '90 phút' },
                  { mins: 120, label: '2 tiếng' }
                ].map((item) => (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => setIntervalMins(item.mins)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                      intervalMins === item.mins
                        ? 'bg-sky-500/25 border-sky-400 text-white shadow-sm'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trạng thái quyền thông báo trình duyệt */}
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-zinc-300">Thông báo trình duyệt:</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  browserPermission === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {browserPermission === 'granted' ? 'Đã cho phép' : 'Chưa cấp quyền'}
                </span>
              </div>
              {browserPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestBrowserNotification}
                  className="mt-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 underline"
                >
                  Bật quyền thông báo trên thiết bị này
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nút lưu */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-xs rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          <span>Lưu cài đặt nhắc nhở</span>
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
