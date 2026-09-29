// lib/utils.js
// Utility functions

export function nanoid(size = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getDayIndex() {
  // JS: 0=Sun, 1=Mon ... convert to 0=Mon, 6=Sun
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function getWeekLabel() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `Tuần ${week} - Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
