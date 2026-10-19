// components/health/WaterHistoryModal.jsx
// Lịch sử chi tiết từng lần uống nước trong ngày, cho phép sửa hoặc xóa bản ghi nhập nhầm
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Droplets, Trash2, Edit2, X, Check } from 'lucide-react';

export default function WaterHistoryModal({
  isOpen,
  onClose,
  title = 'Lịch Sử Uống Nước Hôm Nay',
  logs = [],
  isEditable = true,
  onDeleteLog,
  onUpdateLog
}) {
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  if (!isOpen) return null;

  const totalAmount = logs.reduce((sum, l) => sum + (parseInt(l.amount, 10) || 0), 0);

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditAmount(log.amount);
  };

  const saveEdit = (logId) => {
    if (editAmount && parseInt(editAmount, 10) > 0) {
      onUpdateLog?.(logId, editAmount);
    }
    setEditingId(null);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const d = new Date(timeStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-950 border border-sky-500/30 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_25px_60px_rgba(14,165,233,0.25)] animate-slide-up flex flex-col max-h-[85vh] relative text-zinc-100">
        
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
            <Droplets size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="text-xs text-sky-300 font-bold">
              Tổng cộng: {totalAmount.toLocaleString()} ml ({logs.length} lần)
            </p>
          </div>
        </div>

        {/* Danh sách các lần uống */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 py-1">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">💧</span>
              <p className="text-sm font-semibold">Chưa có bản ghi nào hôm nay</p>
              <p className="text-xs text-zinc-400 mt-1">Hãy uống một ngụm nước và ghi nhận nhé!</p>
            </div>
          ) : (
            logs.map((log) => {
              const isEditing = editingId === log.id;
              return (
                <div
                  key={log.id}
                  className="p-3 bg-zinc-900/70 border border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-sky-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                      <Clock size={15} />
                    </div>

                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-20 bg-zinc-800 border border-sky-400 rounded-lg px-2 py-1 text-xs text-white font-bold"
                            autoFocus
                          />
                          <span className="text-xs text-zinc-400">ml</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-white">+{log.amount} ml</span>
                          <span className="text-[11px] text-zinc-400">{formatTime(log.log_time || log.created_at)}</span>
                        </div>
                      )}
                      {log.note && (
                        <p className="text-[11px] text-sky-300/80 truncate mt-0.5">{log.note}</p>
                      )}
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => saveEdit(log.id)}
                          className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-colors"
                          title="Lưu"
                        >
                          <Check size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(log)}
                          className="p-1.5 text-zinc-400 hover:text-sky-300 hover:bg-white/5 rounded-xl transition-colors"
                          title="Sửa lượng nước"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteLog?.(log.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Xóa bản ghi này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>Khung giờ: Giờ Việt Nam (GMT+7)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
