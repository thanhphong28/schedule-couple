import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = "Xác nhận", 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Đồng ý",
  cancelText = "Hủy bỏ",
  isDanger = false 
}) {
  if (!isOpen) return null;

  const content = (
    <div className="modal-overlay z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div 
        className="w-full max-w-[320px] glass-panel-elevated rounded-[24px] p-6 border border-white/20 shadow-2xl animate-scale-up text-center overflow-hidden relative mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl pointer-events-none ${isDanger ? 'bg-red-500/20' : 'bg-sky-500/20'}`} />
        
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'}`}>
            <AlertCircle size={24} strokeWidth={2.5} />
          </div>
          
          <div className="space-y-1.5">
            <h3 className="text-[17px] font-bold text-white">{title}</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
          </div>

          <div className="w-full flex gap-3 mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-[14px] bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
              }}
              className={`flex-1 py-2.5 rounded-[14px] font-bold text-sm transition-all active:scale-95 shadow-lg ${
                isDanger 
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25' 
                  : 'bg-white hover:bg-zinc-100 text-zinc-900 shadow-white/10'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.getElementById('modal-root') || document.body);
}
