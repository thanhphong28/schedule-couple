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

// Day index: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
export function getInitialTasks() {
  const id = () => nanoid();
  return [
    // ===== THỨ HAI (0) =====
    { id: id(), day: 0, time: '06:30', title: 'Phong dậy hâm cơm + chuẩn bị sáng', person: 'PHONG', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 1 },
    { id: id(), day: 0, time: '07:00', title: 'Thi dậy, cùng ăn sáng', person: 'BOTH', category: 'SELF_CARE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 2 },
    { id: id(), day: 0, time: '07:20', title: 'Phong đi làm (mang cà phê ủ lạnh)', person: 'PHONG', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 3 },
    { id: id(), day: 0, time: '07:40', title: 'Thi đi làm', person: 'THI', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 4 },
    { id: id(), day: 0, time: '17:15', title: 'Thi về sơ chế đồ ăn tối', person: 'THI', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 5 },
    { id: id(), day: 0, time: '17:40', title: 'Phong về – cùng nấu cơm tối', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 6 },
    { id: id(), day: 0, time: '19:30', title: '🏊 Đi bơi (Thứ Hai)', person: 'BOTH', category: 'SPORT', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 7 },
    { id: id(), day: 0, time: '21:00', title: 'Về nhà, tắm rửa, ăn tối', person: 'BOTH', category: 'SELF_CARE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 8 },
    { id: id(), day: 0, time: '21:30', title: 'Phong rửa chén', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 9 },
    { id: id(), day: 0, time: '22:00', title: 'Pha cà phê ủ lạnh cho sáng mai', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 10 },

    // ===== THỨ BA (1) =====
    { id: id(), day: 1, time: '06:30', title: 'Phong dậy hâm cơm + chuẩn bị sáng', person: 'PHONG', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 11 },
    { id: id(), day: 1, time: '07:40', title: 'Thi & Phong đi làm', person: 'BOTH', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 12 },
    { id: id(), day: 1, time: '17:15', title: 'Thi về sơ chế đồ ăn, Phong về nấu cùng', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 13 },
    { id: id(), day: 1, time: '19:30', title: '🏠 Thi quét & lau nhà (Thứ Ba)', person: 'THI', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 14 },
    { id: id(), day: 1, time: '21:00', title: 'Phong rửa chén + pha cà phê ủ lạnh', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 15 },
    { id: id(), day: 1, time: '22:00', title: '💑 Thời gian riêng tư đôi (xem phim / đọc sách)', person: 'BOTH', category: 'DATE', priority: 'LOW', is_completed: false, status: 'TODO', sort_order: 16 },

    // ===== THỨ TƯ (2) =====
    { id: id(), day: 2, time: '06:30', title: 'Phong dậy hâm cơm + chuẩn bị sáng', person: 'PHONG', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 17 },
    { id: id(), day: 2, time: '07:40', title: 'Thi & Phong đi làm', person: 'BOTH', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 18 },
    { id: id(), day: 2, time: '17:15', title: 'Thi về sơ chế, Phong về nấu cơm tối', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 19 },
    { id: id(), day: 2, time: '19:30', title: '🚴 Đi bộ / Chạy / Đạp xe (Thứ Tư)', person: 'BOTH', category: 'SPORT', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 20 },
    { id: id(), day: 2, time: '21:00', title: 'Về nhà, tắm rửa, ăn tối', person: 'BOTH', category: 'SELF_CARE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 21 },
    { id: id(), day: 2, time: '21:30', title: 'Phong rửa chén + pha cà phê ủ lạnh', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 22 },

    // ===== THỨ NĂM (3) =====
    { id: id(), day: 3, time: '06:30', title: 'Phong dậy hâm cơm + chuẩn bị sáng', person: 'PHONG', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 23 },
    { id: id(), day: 3, time: '17:15', title: 'Thi về sơ chế, Phong về nấu cùng', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 24 },
    { id: id(), day: 3, time: '19:30', title: '🏠 Phong quét & lau nhà (Thứ Năm)', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 25 },
    { id: id(), day: 3, time: '21:00', title: 'Phong rửa chén + pha cà phê ủ lạnh', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 26 },

    // ===== THỨ SÁU (4) =====
    { id: id(), day: 4, time: '06:30', title: 'Phong dậy hâm cơm + chuẩn bị sáng', person: 'PHONG', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 27 },
    { id: id(), day: 4, time: '17:15', title: 'Thi về sơ chế, Phong về nấu cơm tối', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 28 },
    { id: id(), day: 4, time: '19:30', title: '🏊 Đi bơi (Thứ Sáu)', person: 'BOTH', category: 'SPORT', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 29 },
    { id: id(), day: 4, time: '21:00', title: 'Về nhà, tắm rửa, ăn tối', person: 'BOTH', category: 'SELF_CARE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 30 },
    { id: id(), day: 4, time: '21:30', title: 'Phong rửa chén + pha cà phê ủ lạnh', person: 'PHONG', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 31 },

    // ===== THỨ BẢY (5) =====
    { id: id(), day: 5, time: '09:00', title: 'Phong làm đến 12:00', person: 'PHONG', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 32 },
    { id: id(), day: 5, time: '12:40', title: 'Phong về nhà (sau làm ca sáng)', person: 'PHONG', category: 'WORK', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 33 },
    { id: id(), day: 5, time: '13:30', title: 'Cùng ăn trưa, nghỉ ngơi', person: 'BOTH', category: 'DATE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 34 },
    { id: id(), day: 5, time: '16:30', title: '🌇 Thể thao hoàng hôn (đi bộ / đạp xe)', person: 'BOTH', category: 'SPORT', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 35 },
    { id: id(), day: 5, time: '19:00', title: '💑 Hẹn hò tối (đi ăn / xem phim / cà phê)', person: 'BOTH', category: 'DATE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 36 },
    { id: id(), day: 5, time: '21:30', title: 'Phong rửa chén + pha cà phê ủ lạnh', person: 'PHONG', category: 'HOUSE', priority: 'LOW', is_completed: false, status: 'TODO', sort_order: 37 },

    // ===== CHỦ NHẬT (6) =====
    { id: id(), day: 6, time: '09:00', title: '🧹 Tổng vệ sinh nhà (Cả hai)', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 38 },
    { id: id(), day: 6, time: '11:00', title: 'Cùng đi chợ / mua đồ tuần mới', person: 'BOTH', category: 'HOUSE', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 39 },
    { id: id(), day: 6, time: '13:00', title: 'Cùng nấu ăn trưa ngon', person: 'BOTH', category: 'DATE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 40 },
    { id: id(), day: 6, time: '15:00', title: '💑 Thời gian chất lượng (spa / picnic / chơi game)', person: 'BOTH', category: 'DATE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 41 },
    { id: id(), day: 6, time: '20:00', title: '📋 Tổng kết tuần & lên kế hoạch tuần tới', person: 'BOTH', category: 'WORK', priority: 'HIGH', is_completed: false, status: 'TODO', sort_order: 42 },
    { id: id(), day: 6, time: '21:00', title: 'Chuẩn bị đồ tuần mới (quần áo, đồ ăn sáng)', person: 'BOTH', category: 'HOUSE', priority: 'MEDIUM', is_completed: false, status: 'TODO', sort_order: 43 },
  ];
}
