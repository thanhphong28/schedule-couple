// src/components/shared/RomanticDatePickerModal.jsx
// Modal chọn ngày thiết kế chuẩn phong cách Couple Care, 100% Tiếng Việt, hỗ trợ chọn nhanh Tháng & Năm

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  X, Check, Sparkles, Heart 
} from 'lucide-react';
import { parseDateSafe } from '../../services/loveCounterService.js';

const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const VI_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Định dạng ngày sang YYYY-MM-DD chuẩn cho DB và state
 */
export function formatToYMD(d) {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Định dạng ngày hiển thị tiếng Việt (VD: 19/10/2026)
 */
export function formatToVietnameseDate(dateStr, includeWeekday = false) {
  const d = parseDateSafe(dateStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  if (!includeWeekday) {
    return `${day}/${month}/${year}`;
  }

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${daysOfWeek[d.getDay()]}, ${day}/${month}/${year}`;
}

export default function RomanticDatePickerModal({
  isOpen,
  onClose,
  value,
  onSelect,
  title = "Chọn ngày",
  minDate = null,
  maxDate = null
}) {
  const initialParsed = useMemo(() => {
    return parseDateSafe(value) || new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(initialParsed.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialParsed.getMonth());
  const [tempSelectedDate, setTempSelectedDate] = useState(initialParsed);
  
  // Chế độ xem: 'calendar' (xem ngày) | 'year-month' (chọn nhanh tháng/năm)
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    if (isOpen) {
      const d = parseDateSafe(value) || new Date();
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
      setTempSelectedDate(d);
      setViewMode('calendar');
    }
  }, [isOpen, value]);

  // Điều hướng tháng
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Tính toán các ô ngày trong tháng
  const daysInGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0: CN, 1: T2...
    // Quy đổi sang Thứ 2 là ngày đầu tuần (T2: 0, T3: 1 ... CN: 6)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Các ngày cuối của tháng trước
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        dayNumber: prevMonthDaysCount - i,
        isCurrentMonth: false,
        dateObj: new Date(currentYear, currentMonth - 1, prevMonthDaysCount - i)
      });
    }

    // Các ngày của tháng này
    for (let d = 1; d <= daysCount; d++) {
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateObj: new Date(currentYear, currentMonth, d)
      });
    }

    // Điền các ngày đầu của tháng sau cho đủ hàng
    const remaining = 42 - cells.length; // 6 hàng x 7 ngày
    if (remaining > 0 && remaining < 7) {
      for (let n = 1; n <= remaining; n++) {
        cells.push({
          dayNumber: n,
          isCurrentMonth: false,
          dateObj: new Date(currentYear, currentMonth + 1, n)
        });
      }
    }

    return cells;
  }, [currentYear, currentMonth]);

  const todayStr = useMemo(() => formatToYMD(new Date()), []);
  const selectedStr = useMemo(() => formatToYMD(tempSelectedDate), [tempSelectedDate]);

  const handleSelectCell = (cellDateObj) => {
    setTempSelectedDate(cellDateObj);
    // Nếu bấm vào ngày của tháng khác thì nhảy sang tháng đó
    if (cellDateObj.getMonth() !== currentMonth) {
      setCurrentMonth(cellDateObj.getMonth());
      setCurrentYear(cellDateObj.getFullYear());
    }
  };

  const handleConfirm = () => {
    const formatted = formatToYMD(tempSelectedDate);
    if (onSelect) onSelect(formatted);
    if (onClose) onClose();
  };

  const handleSelectToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setTempSelectedDate(now);
  };

  if (!isOpen) return null;

  const content = (
    <div 
      className="modal-overlay z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[360px] rounded-[32px] p-5 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-rose-500/30 shadow-[0_15px_50px_rgba(244,63,94,0.25)] text-white relative overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow hiệu ứng nền */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400">
              <CalendarIcon size={16} />
            </span>
            <h3 className="text-sm font-black text-white tracking-wide">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <X size={15} />
          </button>
        </div>

        {/* Selected Date Preview Banner */}
        <div className="relative z-10 my-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Ngày đang chọn:</div>
            <div className="text-sm font-black text-white">
              {formatToVietnameseDate(selectedStr, true) || 'Chưa chọn'}
            </div>
          </div>
          <button
            onClick={handleSelectToday}
            className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-[11px] font-bold text-rose-200 transition-all active:scale-95"
          >
            Hôm nay
          </button>
        </div>

        {/* Navigation Month & Year */}
        <div className="relative z-10 flex items-center justify-between my-2 px-1">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-90"
            title="Tháng trước"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Bấm vào để mở bảng chọn nhanh Tháng / Năm */}
          <button
            onClick={() => setViewMode(prev => prev === 'calendar' ? 'year-month' : 'calendar')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-xs font-black text-rose-200 flex items-center gap-1.5 transition-all active:scale-95 group"
          >
            <span>{VI_MONTHS[currentMonth]}, {currentYear}</span>
            <span className="text-[10px] text-zinc-400 group-hover:text-rose-300">
              {viewMode === 'calendar' ? '▼' : '▲'}
            </span>
          </button>

          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-90"
            title="Tháng sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* VIEW 1: CALENDAR GRID */}
        {viewMode === 'calendar' && (
          <div className="relative z-10 space-y-1 my-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-400 pb-1">
              {VI_WEEKDAYS.map((wd, i) => (
                <span key={wd} className={i >= 5 ? 'text-rose-400/90 font-extrabold' : ''}>
                  {wd}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInGrid.map((cell, idx) => {
                const cellStr = formatToYMD(cell.dateObj);
                const isSelected = cellStr === selectedStr;
                const isToday = cellStr === todayStr;

                return (
                  <button
                    key={`${cellStr}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCell(cell.dateObj)}
                    className={`h-9 w-full rounded-xl text-xs font-bold transition-all relative flex items-center justify-center active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-105 z-10'
                        : isToday
                        ? 'border border-rose-400 text-rose-300 bg-rose-500/10 font-black'
                        : cell.isCurrentMonth
                        ? 'text-zinc-200 hover:bg-white/10 hover:text-white'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    <span>{cell.dayNumber}</span>
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: FAST MONTH & YEAR SELECTOR */}
        {viewMode === 'year-month' && (
          <div className="relative z-10 my-3 p-3 rounded-2xl bg-black/40 border border-white/5 space-y-3 animate-fadeIn">
            {/* Quick Year Navigation */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Năm:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentYear(prev => prev - 1)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  -1
                </button>
                <input
                  type="number"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value, 10) || currentYear)}
                  className="w-16 text-center font-black text-rose-300 bg-zinc-800 rounded-lg py-1 text-xs border border-white/10 focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={() => setCurrentYear(prev => prev + 1)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-xs font-bold"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Quick Months Grid */}
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase block mb-1.5">Chọn Tháng:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {VI_MONTHS.map((mName, idx) => {
                  const isCurrent = currentMonth === idx;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(idx);
                        setViewMode('calendar');
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-rose-500 text-white font-black shadow-md'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      Th.{idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="relative z-10 flex gap-2 pt-3 border-t border-white/5 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-all active:scale-95"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>Xác nhận ngày</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.getElementById('modal-root') || document.body)
    : null;
}
