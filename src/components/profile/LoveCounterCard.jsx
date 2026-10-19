// src/components/profile/LoveCounterCard.jsx
// Siêu tính năng Đếm Ngày Yêu (Love Days Counter), D-Day Kỷ Niệm & Thông Báo Ghim Điện Thoại

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../shared/Toast.jsx';
import { 
  Heart, Calendar, Bell, Sparkles, Plus, Clock, Gift, 
  ChevronRight, ChevronDown, CheckCircle2, Edit3, Trash2, CalendarDays,
  Smartphone, PartyPopper
} from 'lucide-react';
import {
  calculateLoveDays,
  calculateMilestones,
  generateAllDDays,
  updateStickyLoveNotification,
  dismissStickyLoveNotification,
  formatStickyNotificationText
} from '../../services/loveCounterService.js';
import RomanticDatePickerField from '../shared/RomanticDatePickerField.jsx';

export default function LoveCounterCard({ user, partner, couple, refreshAuth }) {
  // Tabs: 'ddays' | 'milestones' | 'calendar' | 'sticky'
  const [activeTab, setActiveTab] = useState('ddays');
  const [customDates, setCustomDates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal Ngày Bắt Đầu Yêu
  const [showEditStartModal, setShowEditStartModal] = useState(false);
  const [startDateInput, setStartDateInput] = useState('');
  const [anniversaryTitleInput, setAnniversaryTitleInput] = useState('');

  // Modal Thêm Sự Kiện / D-Day
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newRepeatYearly, setNewRepeatYearly] = useState(true);
  const [newIcon, setNewIcon] = useState('💖');
  const [newNotes, setNewNotes] = useState('');

  // Sticky Notification Settings State (Chuẩn Hình 2)
  const [stickyEnabled, setStickyEnabled] = useState(() => {
    try {
      return localStorage.getItem('sc_sticky_love_enabled') === 'true';
    } catch {
      return false;
    }
  });

  // Tự động đồng bộ ngày sinh nhật từ 2 tài khoản (User & Partner)
  const [userDob, setUserDob] = useState(user?.dob || null);
  const [partnerDob, setPartnerDob] = useState(partner?.dob || null);

  // Calendar mini-browser state
  const [viewMonthOffset, setViewMonthOffset] = useState(0);

  // Luôn đảm bảo ngày sinh nhật tự động lấy từ 2 tài khoản trong Supabase
  useEffect(() => {
    const syncAccountBirthdays = async () => {
      const ids = [user?.id, partner?.id].filter(Boolean);
      if (ids.length === 0) return;

      try {
        // 1. Lấy dob từ bảng users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, dob')
          .in('id', ids);

        if (usersData) {
          usersData.forEach(u => {
            if (u.id === user?.id && u.dob) setUserDob(u.dob);
            if (u.id === partner?.id && u.dob) setPartnerDob(u.dob);
          });
        }

        // 2. Lấy dự phòng từ health_profiles nếu dob rỗng
        const { data: healthData } = await supabase
          .from('health_profiles')
          .select('user_id, birth_date')
          .in('user_id', ids);

        if (healthData) {
          healthData.forEach(h => {
            if (h.user_id === user?.id && h.birth_date && !userDob) setUserDob(h.birth_date);
            if (h.user_id === partner?.id && h.birth_date && !partnerDob) setPartnerDob(h.birth_date);
          });
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ ngày sinh tự động:', err);
      }
    };

    syncAccountBirthdays();
  }, [user?.id, partner?.id, user?.dob, partner?.dob]);

  // Khởi tạo ngày bắt đầu từ couple
  const effectiveStartDate = useMemo(() => {
    if (couple?.start_date) return couple.start_date;
    if (couple?.created_at) return couple.created_at.split('T')[0];
    return new Date().toISOString().split('T')[0];
  }, [couple]);

  // Cập nhật input khi mở modal
  useEffect(() => {
    if (effectiveStartDate) setStartDateInput(effectiveStartDate);
    setAnniversaryTitleInput(couple?.anniversary_title || 'Ngày chúng mình bắt đầu');
    if (couple?.sticky_notification_enabled !== undefined && couple?.sticky_notification_enabled !== null) {
      setStickyEnabled(Boolean(couple.sticky_notification_enabled));
    }
  }, [couple, effectiveStartDate]);

  // Tính toán số ngày yêu
  const loveStats = useMemo(() => {
    return calculateLoveDays(effectiveStartDate);
  }, [effectiveStartDate]);

  // Tính các mốc kỷ niệm
  const { nextMilestone, milestones } = useMemo(() => {
    return calculateMilestones(effectiveStartDate, loveStats.totalDays);
  }, [effectiveStartDate, loveStats.totalDays]);

  // Tải danh sách ngày đặc biệt từ Supabase
  const fetchCustomDates = async () => {
    if (!couple?.id) return;
    try {
      const { data, error } = await supabase
        .from('couple_special_dates')
        .select('*')
        .eq('couple_id', couple.id)
        .order('event_date', { ascending: true });
      if (error) {
        // Nếu chưa chạy migration 08 thì không báo lỗi crash
        console.warn('couple_special_dates not yet ready or empty:', error.message);
        return;
      }
      if (data) setCustomDates(data);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    fetchCustomDates();

    if (!couple?.id) return;
    const channel = supabase.channel(`special-dates-${couple.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'couple_special_dates', 
        filter: `couple_id=eq.${couple.id}` 
      }, fetchCustomDates)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id]);

  // Tổng hợp tất cả các D-Day (Tự động lấy sinh nhật 2 người từ tài khoản)
  const allDDays = useMemo(() => {
    return generateAllDDays({
      user,
      partner,
      userDob,
      partnerDob,
      startDateStr: effectiveStartDate,
      customDates
    });
  }, [user, partner, userDob, partnerDob, effectiveStartDate, customDates]);

  // Xử lý lưu ngày bắt đầu yêu
  const handleSaveStartDate = async () => {
    if (!startDateInput) return showToast('Vui lòng chọn ngày bắt đầu nhé! 💕', 'error');
    if (!couple?.id) return showToast('Bạn chưa kết nối người yêu để lưu ngày chung!', 'error');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('couples')
        .update({
          start_date: startDateInput,
          anniversary_title: anniversaryTitleInput.trim() || 'Ngày chúng mình bắt đầu'
        })
        .eq('id', couple.id);

      if (error) throw error;
      showToast('Đã lưu ngày bắt đầu yêu thành công! 💖', 'success');
      setShowEditStartModal(false);
      await refreshAuth();
    } catch (e) {
      showToast('Lỗi cập nhật: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thêm sự kiện đặc biệt mới
  const handleAddSpecialDate = async () => {
    if (!newTitle.trim() || !newEventDate) {
      return showToast('Nhập tiêu đề và chọn ngày nha bạn ơi! 🥺', 'error');
    }
    if (!couple?.id) return showToast('Cần kết nối với người yêu trước nhé!', 'error');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('couple_special_dates')
        .insert([{
          couple_id: couple.id,
          title: newTitle.trim(),
          event_date: newEventDate,
          category: newCategory,
          repeat_yearly: newRepeatYearly,
          icon: newIcon || '💖',
          notes: newNotes.trim() || null,
          created_by: user.id
        }]);

      if (error) throw error;
      showToast('Đã thêm ngày đặc biệt vào lịch hẹn hò! ✨', 'success');
      setShowAddDateModal(false);
      setNewTitle('');
      setNewEventDate('');
      setNewNotes('');
      fetchCustomDates();
    } catch (e) {
      showToast('Lỗi thêm sự kiện: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa sự kiện đặc biệt
  const handleDeleteDate = async (id) => {
    try {
      const { error } = await supabase.from('couple_special_dates').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa ngày kỷ niệm!', 'success');
      fetchCustomDates();
    } catch (e) {
      showToast('Lỗi khi xóa: ' + e.message, 'error');
    }
  };

  // Xử lý bật/tắt thông báo ghim cố định trên điện thoại chuẩn Hình 2
  const handleToggleStickyNotif = async (targetEnabled) => {
    setStickyEnabled(targetEnabled);
    try {
      localStorage.setItem('sc_sticky_love_enabled', targetEnabled ? 'true' : 'false');
    } catch {}

    if (targetEnabled) {
      const result = await updateStickyLoveNotification({
        user,
        partner,
        totalDays: loveStats.totalDays
      });

      if (!result.success) {
        showToast(result.reason || 'Không thể bật thông báo ghim 🥺', 'error');
        setStickyEnabled(false);
        try { localStorage.setItem('sc_sticky_love_enabled', 'false'); } catch {}
        return;
      }

      showToast(`Đã ghim lên thanh thông báo: "${result.title}" 📌❤️`, 'success');
    } else {
      await dismissStickyLoveNotification();
      showToast('Đã gỡ ghim thông báo', 'info');
    }
  };

  // Tự động duy trì thông báo ghim khi người dùng mở lại app
  useEffect(() => {
    if (stickyEnabled && loveStats?.totalDays && user) {
      updateStickyLoveNotification({
        user,
        partner,
        totalDays: loveStats.totalDays
      }).catch(() => {});
    }
  }, [stickyEnabled, loveStats?.totalDays, user?.id, partner?.id]);

  useEffect(() => {
    if (!stickyEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && loveStats?.totalDays && user) {
        updateStickyLoveNotification({
          user,
          partner,
          totalDays: loveStats.totalDays
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stickyEnabled, loveStats?.totalDays, user, partner]);

  // Cập nhật preview thông báo chuẩn Hình 2
  const currentStickyPreview = useMemo(() => {
    return formatStickyNotificationText({
      user,
      partner,
      totalDays: loveStats.totalDays
    });
  }, [user, partner, loveStats.totalDays]);

  // Calendar month view computation
  const calendarDays = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + viewMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding before 1st of month
    for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
      days.push({ empty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      thisDate.setHours(0, 0, 0, 0);

      // Check if matches today
      const isToday = thisDate.toDateString() === today.toDateString();

      // Check if matches any milestone
      const matchingMilestone = milestones.find(m => m.targetDate.toDateString() === thisDate.toDateString());

      // Check if matches any special event
      const matchingEvent = allDDays.find(e => {
        const evDate = new Date(e.rawDate);
        return evDate.getDate() === d && evDate.getMonth() === month;
      });

      days.push({
        dayNumber: d,
        date: thisDate,
        isToday,
        milestone: matchingMilestone,
        event: matchingEvent
      });
    }

    return {
      year,
      monthName: `Tháng ${month + 1}, ${year}`,
      days
    };
  }, [viewMonthOffset, milestones, allDDays]);

  return (
    <div className="space-y-4">
      {/* ─── HERO LOVE DAYS COUNTER CARD ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-[32px] p-5 sm:p-6 bg-gradient-to-b from-rose-950/60 via-zinc-900/80 to-zinc-950/90 border border-rose-500/25 shadow-[0_10px_35px_rgba(244,63,94,0.15)] backdrop-blur-xl">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Title & Edit Date Button */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-rose-200">
              {couple?.anniversary_title || 'Đếm Ngày Yêu Của Hai Đứa'}
            </span>
          </div>

          <button
            onClick={() => setShowEditStartModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white transition-all active:scale-95"
            title="Đổi ngày bắt đầu yêu"
          >
            <Edit3 size={12} className="text-rose-400" />
            <span>{loveStats.formattedStartDate}</span>
          </button>
        </div>

        {/* Avatars Connection & Heart Beat */}
        <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 my-2">
          {/* User Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-tr from-rose-400 to-amber-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{user?.gender === 'MALE' ? '👦' : '👧'}</span>
                )}
              </div>
            </div>
            <span className="mt-1 text-xs font-bold text-white max-w-[80px] truncate text-center">
              {user?.display_name || 'Tôi'}
            </span>
          </div>

          {/* Connected Beating Heart */}
          <div className="flex flex-col items-center px-1">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-bounce">
              <Heart size={20} className="fill-white text-white drop-shadow-md" />
              <div className="absolute inset-0 rounded-full bg-rose-400/30 animate-ping" />
            </div>
            <div className="h-1 w-12 bg-gradient-to-r from-transparent via-rose-400 to-transparent mt-1.5 rounded-full" />
          </div>

          {/* Partner Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-tr from-pink-400 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt="Partner" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{partner?.gender === 'MALE' ? '👦' : '👧'}</span>
                )}
              </div>
            </div>
            <span className="mt-1 text-xs font-bold text-rose-300 max-w-[80px] truncate text-center">
              {partner?.display_name || 'BABI'}
            </span>
          </div>
        </div>

        {/* Big Days Counter Number */}
        <div className="relative z-10 text-center my-4">
          <div className="inline-flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-b from-white via-rose-100 to-rose-300 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(244,63,94,0.4)]">
              {loveStats.totalDays}
            </span>
            <span className="text-base sm:text-lg font-black uppercase text-rose-400 tracking-widest">
              Ngày
            </span>
          </div>
          
          {/* Detailed breakdown badge */}
          <div className="mt-1 flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold">
              <Clock size={12} className="text-rose-400" />
              <span>
                {loveStats.years > 0 && `${loveStats.years} năm `}
                {loveStats.months > 0 && `${loveStats.months} tháng `}
                {loveStats.days} ngày bên nhau 💕
              </span>
            </div>
          </div>
        </div>

        {/* Active Milestone Progress Indicator */}
        {nextMilestone && (
          <div className="relative z-10 mt-4 p-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <span className="text-base">{nextMilestone.icon}</span>
                <span>Mốc sắp tới: <b className="text-rose-300">{nextMilestone.title}</b></span>
              </span>
              <span className="text-rose-400 font-extrabold">
                Còn {nextMilestone.daysLeft} ngày
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                style={{ width: `${nextMilestone.progressPercent}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
              <span>Đạt {nextMilestone.progressPercent}%</span>
              <span>Dự kiến: {nextMilestone.formattedTargetDate}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── NAVIGATION TABS ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('ddays')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'ddays'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Gift size={14} />
          <span className="truncate">D-Day</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'milestones'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <PartyPopper size={14} />
          <span className="truncate">Mốc Yêu</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'calendar'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CalendarDays size={14} />
          <span className="truncate">Lịch Xem</span>
        </button>

        <button
          onClick={() => setActiveTab('sticky')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
            activeTab === 'sticky'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone size={14} />
          <span className="truncate">Ghim ĐT</span>
          {stickyEnabled && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ─── TAB CONTENT 1: D-DAY & SPECIAL DATES ───────────────────── */}
      {activeTab === 'ddays' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Gift size={14} className="text-rose-400" />
              <span>Đếm ngược Sinh Nhật & Sự Kiện</span>
            </h4>

            <button
              onClick={() => setShowAddDateModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300 transition-all active:scale-95"
            >
              <Plus size={13} />
              <span>Thêm kỷ niệm</span>
            </button>
          </div>

          <div className="space-y-2">
            {allDDays.map((item) => {
              const isToday = item.dday.isToday;
              const daysLeft = item.dday.daysRemaining;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isToday
                      ? 'bg-gradient-to-r from-rose-500/30 to-amber-500/20 border-rose-400/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'bg-zinc-900/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0 p-2 rounded-xl bg-white/5">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate flex items-center gap-1.5 flex-wrap">
                        <span>{item.title}</span>
                        {(item.category === 'birthday_me' || item.category === 'birthday_partner') && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                            SINH NHẬT
                          </span>
                        )}
                        {item.category === 'anniversary' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold">
                            KỶ NIỆM ĐÔI
                          </span>
                        )}
                        {item.category === 'holiday' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-bold">
                            NGÀY LỄ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span>Ngày: <b className="text-zinc-200">{item.dday.formattedDate}</b></span>
                        {item.notes && <span className="text-zinc-500 truncate">· {item.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {isToday ? (
                        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-black shadow-md animate-pulse">
                          HÔM NAY! 🎉
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-rose-400">
                            D-{daysLeft}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold">
                            Còn {daysLeft} ngày
                          </span>
                        </div>
                      )}
                    </div>

                    {item.isCustom && (
                      <button
                        onClick={() => handleDeleteDate(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Xóa ngày này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: MILESTONES ROADMAP ───────────────────────── */}
      {activeTab === 'milestones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <PartyPopper size={14} className="text-rose-400" />
              <span>Các mốc kỷ niệm ngày yêu</span>
            </h4>
            <span className="text-[11px] font-bold text-rose-300">
              Hiện tại: {loveStats.totalDays} ngày
            </span>
          </div>

          <div className="space-y-2">
            {milestones.map((m) => {
              return (
                <div
                  key={m.days}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    m.isAchieved
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-zinc-300'
                      : m === nextMilestone
                      ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-zinc-900/40 border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-xl bg-white/5">{m.icon}</span>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{m.title}</span>
                        {m.isAchieved && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Đã qua
                          </span>
                        )}
                        {m === nextMilestone && (
                          <span className="text-[10px] text-rose-300 font-extrabold bg-rose-500/25 px-1.5 py-0.5 rounded-full animate-pulse">
                            Đang tiến tới
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Ngày: {m.formattedTargetDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {m.isAchieved ? (
                      <span className="text-xs font-extrabold text-emerald-400">Hoàn thành</span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-rose-300">Còn {m.daysLeft} ngày</span>
                        <span className="text-[9px] text-zinc-500">Mốc {m.days} ngày</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 3: INTERACTIVE MINI CALENDAR ────────────────── */}
      {activeTab === 'calendar' && (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMonthOffset(prev => prev - 1)}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all active:scale-95"
            >
              ← Tháng trước
            </button>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {calendarDays.monthName}
            </span>
            <button
              onClick={() => setViewMonthOffset(prev => prev + 1)}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all active:scale-95"
            >
              Tháng sau →
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-500">
            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span className="text-rose-400">T7</span><span className="text-rose-400">CN</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.days.map((d, index) => {
              if (d.empty) {
                return <div key={`empty-${index}`} className="h-10 rounded-xl" />;
              }

              const hasMilestone = Boolean(d.milestone);
              const hasEvent = Boolean(d.event);

              return (
                <div
                  key={`day-${d.dayNumber}`}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-between p-1 transition-all ${
                    d.isToday
                      ? 'bg-rose-500 text-white font-black border-rose-300 shadow-md scale-105'
                      : hasMilestone
                      ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 font-bold'
                      : hasEvent
                      ? 'bg-rose-500/20 border-rose-400/30 text-rose-200 font-bold'
                      : 'bg-zinc-800/40 border-white/5 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title={
                    d.milestone ? `Mốc: ${d.milestone.title}` :
                    d.event ? `Sự kiện: ${d.event.title}` :
                    `Ngày ${d.dayNumber}`
                  }
                >
                  <span className="text-[11px] leading-none">{d.dayNumber}</span>
                  <div className="flex items-center gap-0.5">
                    {hasMilestone && <span className="text-[8px]">{d.milestone.icon}</span>}
                    {hasEvent && <span className="text-[8px]">{d.event.icon}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-around text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Hôm nay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <span>Ngày đặc biệt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
              <span>Mốc kỷ niệm</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 4: STICKY NOTIFICATION (CHUẨN HÌNH 2) ────────────── */}
      {activeTab === 'sticky' && (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Smartphone size={15} className="text-rose-400" />
                <span>Ghim Thông Báo Ngày Yêu (Thanh Trạng Thái)</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Ghim cố định số ngày yêu ở khay thông báo trên điện thoại giống như ứng dụng đếm ngày yêu.
              </p>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => handleToggleStickyNotif(!stickyEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                stickyEnabled ? 'bg-rose-500' : 'bg-zinc-700'
              }`}
            >
              <div 
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  stickyEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} 
              />
            </button>
          </div>

          {/* Mô phỏng chính xác thanh thông báo của điện thoại (Chuẩn Hình 2) */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-0.5">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stickyEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span>Xem trước thanh thông báo điện thoại</span>
              </span>
              <span className="text-[9px] text-zinc-500 lowercase">thông báo trực tiếp</span>
            </div>

            {/* Notification Row (Design chuẩn Hình 2) */}
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-white/5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Heart icon circle bên trái */}
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                  <Heart size={16} className="fill-rose-500 text-rose-500" />
                </div>

                {/* Nội dung chính: Tên 1 · Avatar · Trái tim Ngày · Avatar · Tên 2 */}
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[120px]">
                    {partner?.display_name || partner?.full_name || 'BABI'}
                  </span>

                  {/* Avatar partner */}
                  <div className="w-5 h-5 rounded-full bg-zinc-700 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center text-[10px]">
                    {partner?.avatar_url ? (
                      <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👧'
                    )}
                  </div>

                  {/* Trái tim & Số ngày yêu */}
                  <span className="flex items-center gap-1 text-xs font-black text-rose-400 shrink-0 px-1.5 bg-rose-500/15 py-0.5 rounded-md border border-rose-500/20">
                    <span>❤️</span>
                    <span>{loveStats.totalDays}</span>
                  </span>

                  {/* Avatar user */}
                  <div className="w-5 h-5 rounded-full bg-zinc-700 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center text-[10px]">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👦'
                    )}
                  </div>

                  <span className="text-xs font-bold text-white truncate max-w-[85px] sm:max-w-[120px]">
                    {user?.display_name || user?.full_name || 'Tôi'}
                  </span>
                </div>
              </div>

              {/* Chevron xuống như trên thông báo Android */}
              <div className="text-zinc-500 shrink-0">
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="text-[10px] text-zinc-400 px-1 flex items-center justify-between">
              <span>Đang ghim: <strong className="text-rose-300 font-semibold">{currentStickyPreview}</strong></span>
              <span className={`font-semibold ${stickyEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {stickyEnabled ? 'Đang ghim trên máy' : 'Chưa ghim'}
              </span>
            </div>
          </div>

          {/* Nút thao tác nhanh đơn giản duy nhất */}
          <button
            type="button"
            onClick={() => handleToggleStickyNotif(!stickyEnabled)}
            className={`w-full py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 ${
              stickyEnabled
                ? 'bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/30'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/20'
            }`}
          >
            <Bell size={14} />
            <span>{stickyEnabled ? 'Cập nhật lại thông báo ghim' : 'Bật & Ghim thông báo ngay'}</span>
          </button>
        </div>
      )}

      {/* ─── MODAL 1: CHỈNH SỬA NGÀY BẮT ĐẦU YÊU ────────────────────── */}
      {showEditStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-[28px] bg-zinc-900 border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Heart size={16} className="text-rose-400 fill-rose-400" />
                <span>Ngày Hai Đứa Bắt Đầu Yêu</span>
              </h3>
              <button 
                onClick={() => setShowEditStartModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Chọn ngày bắt đầu hẹn hò:
                </label>
                <RomanticDatePickerField
                  value={startDateInput}
                  onChange={setStartDateInput}
                  title="Chọn Ngày Hai Đứa Bắt Đầu Yêu"
                  placeholder="Chọn ngày bắt đầu yêu..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Tên kỷ niệm / Lời tựa:
                </label>
                <input
                  type="text"
                  value={anniversaryTitleInput}
                  onChange={(e) => setAnniversaryTitleInput(e.target.value)}
                  placeholder="Ngày chúng mình bắt đầu"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEditStartModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveStartDate}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-xs font-black text-white shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu Ngày Yêu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: THÊM NGÀY ĐẶC BIỆT / D-DAY ──────────────────────── */}
      {showAddDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-[28px] bg-zinc-900 border border-rose-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Gift size={16} className="text-rose-400" />
                <span>Thêm Ngày Kỷ Niệm Của Hai Đứa</span>
              </h3>
              <button 
                onClick={() => setShowAddDateModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Tên kỷ niệm riêng:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Nụ hôn đầu, Đi Đà Lạt, Cầu hôn..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Ngày diễn ra:
                </label>
                <RomanticDatePickerField
                  value={newEventDate}
                  onChange={setNewEventDate}
                  title="Chọn Ngày Kỷ Niệm Diễn Ra"
                  placeholder="Chọn ngày kỷ niệm..."
                />
              </div>

              {/* Emoji Icons picker - Focused on couple memories */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">Biểu tượng kỷ niệm:</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['💖', '💋', '💍', '✈️', '🌸', '☕', '🎬', '🌟', '🏖️', '🍿', '🌹', '💌'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all ${
                        newIcon === emoji 
                          ? 'bg-rose-500/30 border-2 border-rose-400 scale-110' 
                          : 'bg-zinc-800 border border-white/5 hover:bg-zinc-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat Yearly Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">Lặp lại hàng năm</div>
                  <div className="text-[10px] text-zinc-400">Tự động đếm ngược D-Day mỗi năm</div>
                </div>
                <input
                  type="checkbox"
                  checked={newRepeatYearly}
                  onChange={(e) => setNewRepeatYearly(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Ghi chú kỷ niệm (tùy chọn):
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Kỷ niệm đẹp hôm ấy ở quán cafe quen thuộc..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddDateModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleAddSpecialDate}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-xs font-black text-white shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Đang thêm...' : 'Thêm Vào Lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
