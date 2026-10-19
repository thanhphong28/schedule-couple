// src/hooks/useDatePicker.js
// Custom Hook quản lý việc chọn ngày đồng bộ với UI Couple Care 100% Tiếng Việt

import { useState, useCallback } from 'react';
import RomanticDatePickerModal, { 
  formatToVietnameseDate, 
  formatToYMD 
} from '../components/shared/RomanticDatePickerModal.jsx';

export function useDatePicker({ 
  initialDate = '', 
  onSelect = null, 
  title = 'Chọn ngày' 
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const openDatePicker = useCallback((customDate = null) => {
    if (customDate !== null && customDate !== undefined) {
      setSelectedDate(customDate);
    }
    setIsOpen(true);
  }, []);

  const closeDatePicker = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirmDate = useCallback((newDateStr) => {
    setSelectedDate(newDateStr);
    if (onSelect) onSelect(newDateStr);
    setIsOpen(false);
  }, [onSelect]);

  return {
    isOpen,
    selectedDate,
    setSelectedDate,
    openDatePicker,
    closeDatePicker,
    handleConfirmDate,
    formattedDate: formatToVietnameseDate(selectedDate),
    // Component modal có thể render trực tiếp
    DatePickerModal: ({ modalTitle = title }) => (
      <RomanticDatePickerModal
        isOpen={isOpen}
        onClose={closeDatePicker}
        value={selectedDate}
        onSelect={handleConfirmDate}
        title={modalTitle}
      />
    )
  };
}

export default useDatePicker;
