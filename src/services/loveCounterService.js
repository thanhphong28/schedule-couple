// src/services/loveCounterService.js
// Service đếm ngày yêu, tính toán mốc kỷ niệm (Milestones), D-Day đếm ngược và thông báo ghim trên điện thoại

// Danh sách các mốc kỷ niệm ngày yêu chuẩn mực
export const LOVE_MILESTONES = [
  { days: 100, title: '100 Ngày Yêu', badge: '100 DAYS', icon: '🌱' },
  { days: 200, title: '200 Ngày Yêu', badge: '200 DAYS', icon: '🌿' },
  { days: 300, title: '300 Ngày Yêu', badge: '300 DAYS', icon: '🌸' },
  { days: 365, title: '1 Năm Yêu Nhau (365 Ngày)', badge: '1 YEAR', icon: '💍' },
  { days: 500, title: '500 Ngày Yêu', badge: '500 DAYS', icon: '🌟' },
  { days: 700, title: '700 Ngày Yêu', badge: '700 DAYS', icon: '🔥' },
  { days: 730, title: '2 Năm Yêu Nhau (730 Ngày)', badge: '2 YEARS', icon: '💎' },
  { days: 1000, title: '1000 Ngày Yêu (Thiên Niên Kỷ)', badge: '1000 DAYS', icon: '👑' },
  { days: 1095, title: '3 Năm Yêu Nhau', badge: '3 YEARS', icon: '🎉' },
  { days: 1500, title: '1500 Ngày Yêu', badge: '1500 DAYS', icon: '💫' },
  { days: 1825, title: '5 Năm Bền Vững (Nửa Thập Kỷ)', badge: '5 YEARS', icon: '🏆' },
  { days: 2000, title: '2000 Ngày Yêu', badge: '2000 DAYS', icon: '🚀' },
  { days: 3650, title: '10 Năm Kim Cương (1 Thập Kỷ)', badge: '10 YEARS', icon: '⭐' },
];

// Danh sách các ngày lễ tình yêu & gia đình mặc định
export const DEFAULT_HOLIDAYS = [
  { title: 'Valentine Đỏ (Lễ Tình Nhân)', month: 2, day: 14, icon: '💝', category: 'holiday' },
  { title: 'Quốc Tế Phụ Nữ', month: 3, day: 8, icon: '🌷', category: 'holiday' },
  { title: 'Valentine Trắng', month: 3, day: 14, icon: '🤍', category: 'holiday' },
  { title: 'Ngày Phụ Nữ Việt Nam', month: 10, day: 20, icon: '💐', category: 'holiday' },
  { title: 'Giáng Sinh (Noel)', month: 12, day: 24, icon: '🎄', category: 'holiday' },
  { title: 'Giao Thừa Tết Dương Lịch', month: 12, day: 31, icon: '🎆', category: 'holiday' },
];

/**
 * Hàm phân tích ngày tháng an toàn tuyệt đối tránh lỗi múi giờ hoặc format khác nhau
 */
export function parseDateSafe(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const str = String(dateInput).trim();
  // Khớp định dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Khớp định dạng YYYY-MM-DD (format chuẩn SQL & HTML input)
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/**
 * Tính số ngày yêu nhau từ ngày bắt đầu
 * @param {string|Date} startDateStr - YYYY-MM-DD
 */
export function calculateLoveDays(startDateStr) {
  const start = parseDateSafe(startDateStr) || new Date();
  start.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  // Ngày bắt đầu được tính là ngày thứ 1 (hoặc số ngày trôi qua + 1)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const totalDays = Math.max(1, diffDays + 1);

  // Tính số năm, tháng, ngày chi tiết
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) years = 0;
  if (months < 0) months = 0;
  if (days < 0) days = 0;

  return {
    totalDays,
    years,
    months,
    days,
    startDate: start,
    formattedStartDate: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`
  };
}

/**
 * Tính toán mốc kỷ niệm tiếp theo và danh sách tất cả các mốc
 */
export function calculateMilestones(startDateStr, totalDays) {
  const start = parseDateSafe(startDateStr);
  if (!start) return { nextMilestone: null, milestones: [] };

  start.setHours(0, 0, 0, 0);

  let prevMilestoneDays = 0;
  let nextMilestone = null;

  const milestones = LOVE_MILESTONES.map((m) => {
    const targetDate = new Date(start);
    targetDate.setDate(targetDate.getDate() + m.days - 1);

    const isAchieved = totalDays >= m.days;
    const daysLeft = m.days - totalDays;

    const formattedTargetDate = `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${targetDate.getFullYear()}`;

    const milestoneObj = {
      ...m,
      targetDate,
      formattedTargetDate,
      isAchieved,
      daysLeft: Math.max(0, daysLeft)
    };

    if (!isAchieved && !nextMilestone) {
      nextMilestone = {
        ...milestoneObj,
        prevDays: prevMilestoneDays,
        progressPercent: Math.min(
          100,
          Math.max(0, Math.round(((totalDays - prevMilestoneDays) / (m.days - prevMilestoneDays)) * 100))
        )
      };
    }

    if (isAchieved) {
      prevMilestoneDays = m.days;
    }

    return milestoneObj;
  });

  return { nextMilestone, milestones };
}

/**
 * Tính số ngày D-Day cho 1 ngày cụ thể (sinh nhật hoặc ngày kỷ niệm)
 */
export function calculateDDay(eventDateStr, repeatYearly = true) {
  const event = parseDateSafe(eventDateStr);
  if (!event) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (repeatYearly) {
    const thisYearEvent = new Date(now.getFullYear(), event.getMonth(), event.getDate());
    thisYearEvent.setHours(0, 0, 0, 0);

    let targetDate = thisYearEvent;
    if (thisYearEvent < now) {
      // Đã qua năm nay -> tính cho năm sau
      targetDate = new Date(now.getFullYear() + 1, event.getMonth(), event.getDate());
      targetDate.setHours(0, 0, 0, 0);
    }

    const diffDays = Math.round((targetDate - now) / (1000 * 60 * 60 * 24));
    return {
      daysRemaining: diffDays,
      isToday: diffDays === 0,
      targetDate,
      formattedDate: `${String(event.getDate()).padStart(2, '0')}/${String(event.getMonth() + 1).padStart(2, '0')}`,
      formattedFullDate: `${String(event.getDate()).padStart(2, '0')}/${String(event.getMonth() + 1).padStart(2, '0')}/${event.getFullYear()}`
    };
  } else {
    const diffDays = Math.round((event - now) / (1000 * 60 * 60 * 24));
    return {
      daysRemaining: diffDays,
      isToday: diffDays === 0,
      isPast: diffDays < 0,
      targetDate: event,
      formattedDate: `${String(event.getDate()).padStart(2, '0')}/${String(event.getMonth() + 1).padStart(2, '0')}/${event.getFullYear()}`,
      formattedFullDate: `${String(event.getDate()).padStart(2, '0')}/${String(event.getMonth() + 1).padStart(2, '0')}/${event.getFullYear()}`
    };
  }
}

/**
 * Tạo danh sách D-Day tổng hợp (Sinh nhật 2 người tự động lấy từ tài khoản, Kỷ niệm yêu, Ngày lễ, Sự kiện riêng)
 */
export function generateAllDDays({ user, partner, userDob, partnerDob, startDateStr, customDates = [] }) {
  const list = [];

  // 1. Kỷ niệm ngày yêu hàng năm
  if (startDateStr) {
    const dday = calculateDDay(startDateStr, true);
    if (dday) {
      list.push({
        id: 'anniversary-yearly',
        title: 'Kỷ Niệm Ngày Yêu Hàng Năm',
        category: 'anniversary',
        icon: '💍',
        dday,
        isCustom: false,
        isAccountSynced: false,
        rawDate: startDateStr,
        badgeText: 'KỶ NIỆM ĐÔI'
      });
    }
  }

  // 2. Sinh nhật của Bạn
  const myBirthday = userDob || user?.dob;
  if (myBirthday) {
    const dday = calculateDDay(myBirthday, true);
    if (dday) {
      list.push({
        id: 'birthday-me',
        title: `Sinh nhật ${user?.display_name || 'Bạn'}`,
        category: 'birthday_me',
        icon: '🎂',
        dday,
        isCustom: false,
        isAccountSynced: true,
        rawDate: myBirthday,
        badgeText: 'SINH NHẬT'
      });
    }
  }

  // 3. Sinh nhật Người ấy
  const theirBirthday = partnerDob || partner?.dob;
  if (theirBirthday) {
    const dday = calculateDDay(theirBirthday, true);
    if (dday) {
      list.push({
        id: 'birthday-partner',
        title: `Sinh nhật ${partner?.display_name || 'BABI'}`,
        category: 'birthday_partner',
        icon: '🎁',
        dday,
        isCustom: false,
        isAccountSynced: true,
        rawDate: theirBirthday,
        badgeText: 'SINH NHẬT'
      });
    }
  }

  // 4. Các ngày lễ lãng mạn phổ biến
  const nowYear = new Date().getFullYear();
  DEFAULT_HOLIDAYS.forEach(h => {
    const holidayDate = `${nowYear}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    const dday = calculateDDay(holidayDate, true);
    if (dday) {
      list.push({
        id: `holiday-${h.month}-${h.day}`,
        title: h.title,
        category: 'holiday',
        icon: h.icon,
        dday,
        isCustom: false,
        isAccountSynced: false,
        rawDate: holidayDate,
        badgeText: 'NGÀY LỄ'
      });
    }
  });

  // 5. Các ngày kỷ niệm riêng do 2 bạn tạo thêm (Nụ hôn đầu, Du lịch, Cầu hôn...)
  if (Array.isArray(customDates)) {
    customDates.forEach(cd => {
      const dday = calculateDDay(cd.event_date, cd.repeat_yearly !== false);
      if (dday) {
        list.push({
          id: cd.id,
          title: cd.title,
          category: cd.category || 'custom',
          icon: cd.icon || '💖',
          notes: cd.notes,
          repeat_yearly: cd.repeat_yearly !== false,
          dday,
          isCustom: true,
          isAccountSynced: false,
          rawDate: cd.event_date,
          badgeText: cd.repeat_yearly !== false ? 'HÀNG NĂM' : 'MỘT LẦN'
        });
      }
    });
  }

  // Sắp xếp: sự kiện gần nhất lên đầu (D-0 -> D-1 -> D-365)
  list.sort((a, b) => a.dday.daysRemaining - b.dday.daysRemaining);

  return list;
}

/**
 * Định dạng chuỗi thông báo ghim cố định trên điện thoại theo yêu cầu của user
/**
 * Định dạng tiêu đề thông báo ghim trên thanh trạng thái điện thoại chuẩn như ứng dụng đếm ngày yêu:
 * Ví dụ: "Nhật Thi ❤️ 422 Thanh Phong"
 */
export function formatStickyNotificationText({ user, partner, totalDays, format = 'standard', customFormat = '' }) {
  const name1 = partner?.display_name || partner?.full_name || 'BABI';
  const name2 = user?.display_name || user?.full_name || 'Tôi';

  if (format === 'custom' && customFormat.trim()) {
    return customFormat
      .replace(/{days}/g, totalDays)
      .replace(/{name1}/g, name1)
      .replace(/{name2}/g, name2);
  }

  // Chuẩn 100% như thanh thông báo đếm ngày yêu trên điện thoại (Hình 2)
  return `${name1} ❤️ ${totalDays} ${name2}`;
}

/**
 * Hiển thị hoặc cập nhật thông báo ghim cố định trên hệ điều hành / điện thoại
 */
export async function updateStickyLoveNotification({ user, partner, totalDays, format = 'standard', customFormat = '' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, reason: 'Trình duyệt không hỗ trợ Web Notification' };
  }

  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, reason: 'Chưa được cấp quyền thông báo' };
    }
  }

  const title = formatStickyNotificationText({ user, partner, totalDays, format, customFormat });
  const body = `Hôm nay là ngày thứ ${totalDays} hai bạn bên nhau! Chúc tình yêu luôn ngọt ngào và đong đầy 💖`;

  const options = {
    body,
    tag: 'couple-sticky-love-counter', // Cùng tag để cập nhật đè lên thông báo cũ, không làm rác thanh thông báo
    requireInteraction: true,          // Yêu cầu giữ cố định trên thanh trạng thái / màn hình khóa (Android / Windows)
    silent: true,                      // Không phát chuông phiền phức khi cập nhật định kỳ
    renotify: false,
    icon: user?.avatar_url || '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: window.location.origin
    }
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return { success: true, mode: 'serviceWorker', title };
      }
    }
    // Fallback nếu không có SW
    new Notification(title, options);
    return { success: true, mode: 'windowNotification', title };
  } catch (err) {
    console.error('Lỗi hiển thị sticky notification:', err);
    try {
      new Notification(title, { body: options.body, tag: options.tag });
      return { success: true, mode: 'fallback', title };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

/**
 * Hủy thông báo ghim cố định
 */
export async function dismissStickyLoveNotification() {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const notifs = await reg.getNotifications({ tag: 'couple-sticky-love-counter' });
      notifs.forEach(n => n.close());
    }
  } catch (e) {
    console.warn('Lỗi dismiss notification:', e);
  }
}
