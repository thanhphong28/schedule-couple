// data/initialTasks.js
// 31 initial weekly tasks for Thi & Phong

import { nanoid } from '../lib/utils.js';

export const CATEGORIES = {
  HOUSE: { label: 'Việc nhà', color: '#A8D8A8', bg: '#f0fdf0', icon: '🏠' },
  DATE: { label: 'Hẹn hò', color: '#E27387', bg: '#fceef1', icon: '💑' },
  SPORT: { label: 'Thể thao', color: '#74B9FF', bg: '#eff8ff', icon: '🏃' },
  WORK: { label: 'Công việc', color: '#FDCB6E', bg: '#fffbeb', icon: '💼' },
  SELF_CARE: { label: 'Chăm sóc', color: '#B2BEC3', bg: '#f8f9fa', icon: '🌸' },
};

export const PERSONS = {
  PHONG: { label: 'Phong', color: '#6C5CE7', bg: '#f0eeff', emoji: '👦' },
  THI: { label: 'Thi', color: '#E27387', bg: '#fceef1', emoji: '👧' },
  BOTH: { label: 'Cả hai', color: '#00B894', bg: '#e8faf4', emoji: '💑' },
};

export const PRIORITY = {
  HIGH: { label: 'Cao', color: '#E17055', bg: '#fff0ed' },
  MEDIUM: { label: 'Trung bình', color: '#FDCB6E', bg: '#fffbeb' },
  LOW: { label: 'Thấp', color: '#00B894', bg: '#e8faf4' },
};

export const STATUS = {
  TODO: 'Chưa làm',
  DOING: 'Đang làm',
  DONE: 'Hoàn thành',
};

export const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Day index: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
export function getInitialTasks() {
  return [];
}
