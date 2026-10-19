// src/components/shared/RomanticDatePickerField.jsx
// Ô chọn ngày đồng bộ giao diện Couple Care thay thế hoàn toàn input type="date" mặc định

import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import RomanticDatePickerModal, { formatToVietnameseDate } from './RomanticDatePickerModal.jsx';

export default function RomanticDatePickerField({
  value,
  onChange,
  placeholder = "Chọn ngày...",
  title = "Chọn ngày",
  disabled = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);

  const displayFormatted = value ? formatToVietnameseDate(value) : '';

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 border border-white/10 hover:border-rose-400/50 flex items-center justify-between text-left transition-all active:scale-[0.99] group ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon 
            size={16} 
            className="text-rose-400 shrink-0 group-hover:scale-110 transition-transform" 
          />
          <span className={`text-xs font-bold truncate ${value ? 'text-white' : 'text-zinc-500'}`}>
            {displayFormatted || placeholder}
          </span>
        </div>

        <ChevronDown 
          size={14} 
          className="text-zinc-500 group-hover:text-rose-300 transition-colors shrink-0 ml-2" 
        />
      </button>

      <RomanticDatePickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        value={value}
        onSelect={(newDate) => {
          if (onChange) onChange(newDate);
          setIsOpen(false);
        }}
        title={title}
      />
    </>
  );
}
