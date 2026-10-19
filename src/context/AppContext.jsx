// context/AppContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getInitialTasks } from '../data/initialTasks.js';
import { isSupabaseReady, supabase } from '../lib/supabase.js';
import { nanoid, playNotificationChime, lsGet, lsSet } from '../lib/utils.js';
import { useAuth } from './AuthContext.jsx';
import { showToast } from '../components/shared/Toast.jsx';

const AppContext = createContext(null);


// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbGetTasks(coupleId) {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from('tasks').select('*').eq('couple_id', coupleId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
async function sbGetTaskLogs(coupleId) {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from('task_logs').select('*').eq('couple_id', coupleId);
  if (error) throw error;
  return data;
}
async function sbGetReviews(coupleId) {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from('weekly_reviews').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
async function sbGetWallpapers(coupleId) {
  if (!coupleId) return [];
  const { data, error } = await supabase
    .from('wallpapers').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
async function sbUpsertWallpaper(wp) {
  if (!isSupabaseReady) return;
  try {
    const { error } = await supabase.from('wallpapers').upsert(wp);
    if (error) console.warn('Supabase wallpaper upsert error:', error.message);
  } catch (err) {
    console.warn('Supabase wallpaper upsert failed:', err);
  }
}
async function sbDeleteWallpaper(id) {
  if (!isSupabaseReady) return;
  try {
    const { error } = await supabase.from('wallpapers').delete().eq('id', id);
    if (error) console.warn('Supabase wallpaper delete error:', error.message);
  } catch (err) {
    console.warn('Supabase wallpaper delete failed:', err);
  }
}

export const PRESET_WALLPAPERS = [
  { id: 'couple_sunset', name: 'Trái Tim Hoàng Hôn 🌅', url: '/wallpapers/couple_sunset.jpg', desc: 'Ấm áp & lãng mạn' },
  { id: 'couple_hands', name: 'Nắm Tay Dạo Bước 🤝', url: '/wallpapers/couple_hands.jpg', desc: 'Bình yên bên nhau' },
  { id: 'romantic_lights', name: 'Đốm Sáng Trái Tim ✨', url: '/wallpapers/romantic_lights.jpg', desc: 'Ánh đèn lung linh' },
  { id: 'starry_mountains', name: 'Ngân Hà Núi Tuyết 🌌', url: '/wallpapers/starry_mountains.jpg', desc: 'Dải ngân hà thơ mộng' },
  { id: 'twilight_clouds', name: 'Biển Chiều Hoàng Hôn ⛵', url: '/wallpapers/twilight_clouds.jpg', desc: 'Bình yên & sâu lắng' },
  { id: 'cherry_blossom', name: 'Hoa Anh Đào Mùa Xuân 🌸', url: '/wallpapers/cherry_blossom.jpg', desc: 'Trong trẻo ngọt ngào' },
  { id: 'dreamy_galaxy', name: 'Vũ Trụ Tình Yêu 🪐', url: '/wallpapers/dreamy_galaxy.jpg', desc: 'Huyền ảo & nhiệm màu' },
  { id: 'aurora_mesh', name: 'Cực Quang Huyền Ảo 🔮', url: 'aurora', desc: 'Gradient lụa hiện đại' },
];

export function AppProvider({ children }) {
  const { user, partner, couple } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [synced, setSynced] = useState(false);
  
  // Theme state
  const [themeId, setThemeIdRaw] = useState(user?.theme_id || 'ocean');
  
  // Wallpaper state
  const [wallpaper, setWallpaperRaw] = useState(user?.wallpaper_id || null);
  const [customWallpapers, setCustomWallpapers] = useState([]);

  function setThemeId(id) {
    setThemeIdRaw(id);
    localStorage.setItem('sc_theme', id);
    
    

    if (user?.id && isSupabaseReady) {
      supabase.from('users').update({ theme_id: id }).eq('id', user.id).then(({error}) => {
        if (error) console.error('Failed to save theme to Supabase:', error.message);
      });
    }
  }

  function setWallpaper(id) {
    setWallpaperRaw(id);
    
    
    

    if (user?.id && isSupabaseReady) {
      supabase.from('users').update({ wallpaper_id: id }).eq('id', user.id).then(({error}) => {
        if (error) console.error('Failed to save wallpaper to Supabase:', error.message);
      });
    }
  }

  // ── Persist to localStorage ────────────────────────────────────────────────


  // ── On mount: load from Supabase (if configured) ──────────────────────────
  useEffect(() => {
    // Clear localStorage on mount if couple changes (or logs out)
    const currentCoupleId = couple?.id || 'none';
    const lastCoupleId = localStorage.getItem('sc_last_couple_id');
    
    if (lastCoupleId !== currentCoupleId) {
      setTasks([]);
      setTaskLogs([]);
      setReviews([]);
      localStorage.setItem('sc_last_couple_id', currentCoupleId);
    }

    // Load initial data from Supabase
    if (!couple?.id) return;
    
    Promise.all([
      sbGetTasks(couple.id).catch(err => { console.warn('Tasks err', err); return null; }), 
      sbGetTaskLogs(couple.id).catch(err => { console.warn('TaskLogs err', err); return null; }), 
      sbGetReviews(couple.id).catch(err => { console.warn('Reviews err', err); return null; }), 
      sbGetWallpapers(couple.id).catch(() => [])
    ]).then(([t, logs, r, wps]) => {
      if (t) setTasks(t);
      if (logs) setTaskLogs(logs);
      if (r) setReviews(r);
      if (wps) {
        setCustomWallpapers(wps);
      }
      setSynced(true);
    });
  }, [couple?.id]); // Re-run when couple changes

  useEffect(() => {
    if (user) {
      setThemeIdRaw(user.theme_id || 'ocean');
      setWallpaperRaw(user.wallpaper_id || null);
    }
  }, [user?.id, user?.theme_id, user?.wallpaper_id]);

  // ── Browser & In-App Notifications State & Helpers ──────────────────────────
  const [activeNotification, setActiveNotification] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState(() => {
    return lsGet('sc_notif_history') || [];
  });
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';
  });

  const dismissNotification = () => setActiveNotification(null);

  const addNotificationToHistory = (notif) => {
    setNotificationHistory(prev => {
      const next = [notif, ...prev].slice(0, 20); // Keep last 20
      lsSet('sc_notif_history', next);
      return next;
    });
  };

  const clearNotification = (id) => {
    setNotificationHistory(prev => {
      const next = prev.filter(n => n.id !== id);
      lsSet('sc_notif_history', next);
      return next;
    });
  };

  // Auto-dismiss banner after 8.5 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  const requestNotifPermission = async () => {
    if (typeof window !== 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      return perm;
    } catch (e) {
      console.warn('Lỗi xin quyền thông báo:', e);
      return 'denied';
    }
  };

  const tasksRef = useRef(tasks);
  const taskLogsRef = useRef(taskLogs);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { taskLogsRef.current = taskLogs; }, [taskLogs]);

  const toggleTaskRef = useRef(null);
  const toggleTaskInstanceRef = useRef(null);

  const sendNotification = ({ title, body, taskId, isDue, timeStr, icon, actionType, cheerId }) => {
    // 1. Dual-tone audio chime (Web Audio API)
    playNotificationChime();

    const notifData = {
      id: nanoid(),
      title,
      body,
      taskId,
      isDue,
      timeStr,
      icon: icon || (isDue ? '⏰' : (taskId ? '⏳' : '💌')),
      actionType,
      cheerId,
      timestamp: Date.now(),
    };

    // 2. In-App Floating Banner (Hiển thị nổi trên tất cả thiết bị kể cả iPhone Safari)
    setActiveNotification(notifData);
    addNotificationToHistory(notifData);

    // 3. System Web Notification (Khi trình duyệt/PWA cấp quyền)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notifOptions = {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: taskId ? `task-${taskId}-${isDue ? 'due' : '5m'}` : (cheerId ? `cheer-${cheerId}` : 'notif-' + Date.now()),
        requireInteraction: true,
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, notifOptions);
        }).catch(err => console.warn('SW showNotification error:', err));
      } else {
        try {
          const notif = new Notification(title, notifOptions);
          notif.onclick = () => {
            window.focus();
            if (taskId && toggleTaskRef.current && isDue) {
              toggleTaskRef.current(taskId);
            }
            notif.close();
          };
        } catch (err) {
          console.warn('System notification error:', err);
        }
      }
    }
  };

  // Ghi nhận nhanh 250ml nước từ thông báo nhắc nhở
  const quickLogWater = async (amount = 250) => {
    if (!user?.id) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nowIso = now.toISOString();

    const newLog = {
      user_id: user.id,
      amount: parseInt(amount, 10),
      log_date: todayStr,
      log_time: nowIso,
      note: 'Uống nhanh từ thông báo 💧'
    };

    try {
      const localKey = `sc_water_${user.id}_${todayStr}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify([newLog, ...existing]));
    } catch {}

    if (isSupabaseReady) {
      try {
        await supabase.from('water_logs').insert([newLog]);
      } catch (err) {
        console.warn('Lỗi ghi nhanh water_logs:', err);
      }
    }

    showToast(`Đã uống +${amount}ml nước mát! Tươi tắn quá 💧✨`, 'success');
    dismissNotification();
  };

  const triggerTestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await requestNotifPermission();
    }
    sendNotification({
      title: '🧪 Thử nghiệm thông báo 💕',
      body: 'Hệ thống chuông và thông báo nhắc nhở đang hoạt động cực kỳ mượt mà trên máy của bạn!',
      taskId: null,
      isDue: false,
      timeStr: 'Bây giờ',
      icon: '🔔'
    });
  };

  // Bộ lọc chống trùng lặp thông báo realtime
  const processedNotifKeysRef = useRef(new Set());
  const handleIncomingCheer = (cheer) => {
    if (!cheer) return;
    if (cheer.sender_id === user?.id) return;
    if (cheer.receiver_id && cheer.receiver_id !== user?.id) return;

    const notifKey = cheer.id || `${cheer.sender_id}_${cheer.cheer_type}_${cheer.message}_${Math.floor(Date.now() / 4000)}`;
    if (processedNotifKeysRef.current.has(notifKey)) return;
    processedNotifKeysRef.current.add(notifKey);

    if (processedNotifKeysRef.current.size > 50) {
      const arr = Array.from(processedNotifKeysRef.current);
      processedNotifKeysRef.current = new Set(arr.slice(-30));
    }

    const senderName = cheer.sender_name || partner?.display_name || partner?.full_name || 'Người yêu';
    let title = `💌 Lời nhắn từ ${senderName}`;
    let icon = '💌';
    let actionType = null;

    if (cheer.cheer_type === 'drink_water') {
      title = `💧 ${senderName} nhắc bạn uống nước!`;
      icon = '💧';
      actionType = 'drink_water';
    } else if (cheer.cheer_type === 'workout') {
      title = `🏃‍♂️ ${senderName} nhắc bạn vận động!`;
      icon = '🏃‍♂️';
    } else if (cheer.cheer_type === 'congrats') {
      title = `🎉 Lời khen từ ${senderName}!`;
      icon = '🎉';
    } else if (cheer.cheer_type === 'hug') {
      title = `🧸 Cái ôm từ ${senderName}`;
      icon = '🧸';
    } else if (cheer.cheer_type === 'status_message') {
      title = `🛵 ${senderName} vừa cập nhật:`;
      icon = '🛵';
    }

    sendNotification({
      title,
      body: cheer.message || 'Gửi gắm yêu thương tới bạn 💕',
      icon,
      actionType,
      cheerId: cheer.id
    });
  };

  // ── LẮNG NGHE REALTIME TOÀN ỨNG DỤNG (TASKS, HOÀN THÀNH, LỜI NHẮN, NHẮC NƯỚC) ──
  useEffect(() => {
    if (!couple?.id) return;

    // 1. Tasks realtime
    const taskSub = supabase
      .channel(`tasks-rt-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${couple.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const isCreatedByPartner = payload.new?.created_by && payload.new.created_by !== user?.id;
          if (isCreatedByPartner) {
            sendNotification({
              title: `📝 ${partner?.display_name || 'Nửa kia'} vừa thêm việc mới!`,
              body: `"${payload.new?.title || 'Công việc mới'}" — Vào xem lịch trình nhé 💕`,
              icon: '📝',
              taskId: payload.new?.id
            });
          }
        }
        sbGetTasks(couple.id).then(setTasks).catch(console.error);
      })
      .subscribe();

    // 2. Task Logs realtime (khi đối phương hoàn thành công việc)
    const taskLogsSub = supabase
      .channel(`task-logs-rt-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_logs', filter: `couple_id=eq.${couple.id}` }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (payload.new?.is_completed && payload.new?.user_id && payload.new.user_id !== user?.id) {
            const completedTask = tasksRef.current.find(t => t.id === payload.new.task_id);
            const taskTitle = completedTask?.title ? `"${completedTask.title}"` : 'một công việc';
            sendNotification({
              title: `✨ ${partner?.display_name || 'Nửa kia'} vừa hoàn thành một việc!`,
              body: `Đã xong ${taskTitle} 🎉 Đáng yêu quá!`,
              icon: '✨'
            });
          }
        }
        sbGetTaskLogs(couple.id).then(setTaskLogs).catch(console.error);
      })
      .subscribe();

    // 3. Weekly reviews
    const reviewSub = supabase
      .channel(`reviews-rt-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_reviews', filter: `couple_id=eq.${couple.id}` }, () => {
        sbGetReviews(couple.id).then(setReviews).catch(console.error);
      })
      .subscribe();

    // 4. Wallpapers
    const wpSub = supabase
      .channel(`wallpapers-rt-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallpapers', filter: `couple_id=eq.${couple.id}` }, () => {
        sbGetWallpapers(couple.id).then(wps => {
          if (wps) setCustomWallpapers(wps);
        }).catch(console.error);
      })
      .subscribe();

    // 5. User settings
    const userSub = supabase
      .channel(`user-settings-rt-${user?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user?.id}` }, (payload) => {
        if (payload.new.theme_id) setThemeIdRaw(payload.new.theme_id);
        if (payload.new.wallpaper_id !== undefined) setWallpaperRaw(payload.new.wallpaper_id);
      })
      .subscribe();

    // 6. Lời nhắn yêu thương & Nhắc uống nước (couple_cheers) qua Postgres Changes
    const cheersSub = supabase
      .channel(`couple-cheers-global-${user?.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'couple_cheers', 
        filter: `receiver_id=eq.${user?.id}` 
      }, (payload) => {
        handleIncomingCheer(payload.new);
      })
      .subscribe();

    // 7. Kênh Broadcast WebSocket tức thời cho cặp đôi (Zero-latency P2P)
    const notifySub = supabase
      .channel(`couple_notifications_${couple.id}`, {
        config: { broadcast: { self: false } }
      })
      .on('broadcast', { event: 'new_cheer' }, ({ payload }) => {
        handleIncomingCheer(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(taskLogsSub);
      supabase.removeChannel(reviewSub);
      supabase.removeChannel(wpSub);
      supabase.removeChannel(userSub);
      supabase.removeChannel(cheersSub);
      supabase.removeChannel(notifySub);
    };
  }, [couple?.id, user?.id, partner?.id]);

  // ── Custom Wallpaper operations ──────────────────────────────────────────
  function addCustomWallpaper({ id, name, url }) {
    const newWp = {
      id: id || nanoid(),
      name: name || 'Ảnh kỷ niệm 💕',
      url,
      is_custom: true,
      couple_id: couple?.id,
      created_at: new Date().toISOString(),
    };
    setCustomWallpapers(prev => {
      const next = [newWp, ...prev.filter(w => w.id !== newWp.id)];
      return next;
    });
    setWallpaper(newWp.id);
    sbUpsertWallpaper(newWp);
    return newWp;
  }

  function deleteCustomWallpaper(id) {
    setCustomWallpapers(prev => {
      const next = prev.filter(w => w.id !== id);
      return next;
    });
    if (wallpaper === id) {
      setWallpaper(null); // Reset to theme default if the deleted one was active
    }
    sbDeleteWallpaper(id);
  }

  // ── Smart Scheduled Water Reminders Ticker ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let waterSettings = null;

    const loadWaterSettings = async () => {
      try {
        const localSettings = lsGet(`sc_water_reminder_settings_${user.id}`);
        if (localSettings) waterSettings = localSettings;

        if (isSupabaseReady) {
          const { data } = await supabase
            .from('health_profiles')
            .select('water_reminder_enabled, water_reminder_start, water_reminder_end, water_reminder_interval, daily_water_goal')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            waterSettings = data;
            lsSet(`sc_water_reminder_settings_${user.id}`, data);
          }
        }
      } catch (err) {
        console.warn('Lỗi load water reminder settings:', err);
      }
    };

    loadWaterSettings();

    const checkWaterReminder = () => {
      const settings = waterSettings || lsGet(`sc_water_reminder_settings_${user.id}`) || {
        water_reminder_enabled: true,
        water_reminder_start: '08:00',
        water_reminder_end: '21:00',
        water_reminder_interval: 90
      };

      if (!settings.water_reminder_enabled) return;

      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = (settings.water_reminder_start || '08:00').split(':').map(Number);
      const [endH, endM] = (settings.water_reminder_end || '21:00').split(':').map(Number);
      const startMins = (startH || 8) * 60 + (startM || 0);
      const endMins = (endH || 21) * 60 + (endM || 0);

      // Chỉ nhắc trong khung giờ hoạt động
      if (nowMins < startMins || nowMins > endMins) return;

      const intervalMs = (settings.water_reminder_interval || 90) * 60 * 1000;
      const lastReminder = parseInt(localStorage.getItem(`sc_last_water_remind_${user.id}`) || '0', 10);
      const nowMs = Date.now();

      // Lần đầu mở app: khởi tạo mốc thời gian bắt đầu tính chu kỳ
      if (!lastReminder) {
        localStorage.setItem(`sc_last_water_remind_${user.id}`, String(nowMs));
        return;
      }

      // Nếu đã đến chu kỳ nhắc nhở
      if (nowMs - lastReminder >= intervalMs) {
        localStorage.setItem(`sc_last_water_remind_${user.id}`, String(nowMs));

        sendNotification({
          title: '💧 Đến giờ uống nước rồi!',
          body: 'Nạp thêm một ngụm nước mát để giữ năng lượng và sức khỏe dồi dào nhé! 💕',
          icon: '💧',
          actionType: 'drink_water'
        });
      }
    };

    const waterInterval = setInterval(checkWaterReminder, 30000);
    return () => clearInterval(waterInterval);
  }, [user?.id]);

  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      // 0=Mon, 1=Tue, ..., 6=Sun
      const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const nowTotalMins = currentHour * 60 + currentMin;
      
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayKey = `${yyyy}-${mm}-${dd}`;

      tasksRef.current.forEach(t => {
        const log = taskLogsRef.current.find(l => l.task_id === t.id && l.target_date === todayKey);
        if (log?.is_deleted) return;
        
        const isCompleted = log ? log.is_completed : false;
        const taskTime = log?.new_time || t.time;
        
        if (t.day !== currentDay || isCompleted || !taskTime) return;

        // Parse start time "HH:mm" from "HH:mm" or "HH:mm - HH:mm"
        const startTimeStr = taskTime.split('-')[0].trim();
        const match = startTimeStr.match(/^(\d{1,2}):(\d{2})/);
        if (!match) return;

        const startHour = parseInt(match[1], 10);
        const startMin = parseInt(match[2], 10);
        const startTotalMins = startHour * 60 + startMin;
        const diffMins = startTotalMins - nowTotalMins;

        // 1. NHẮC TRƯỚC 5 PHÚT (diffMins từ 1 đến 5 phút)
        if (diffMins > 0 && diffMins <= 5) {
          const key5m = `sc_notif_5m_${t.id}_${todayKey}`;
          if (!localStorage.getItem(key5m)) {
            localStorage.setItem(key5m, 'true');
            sendNotification({
              title: `⏳ Sắp đến giờ: ${t.title}`,
              body: `Còn ${diffMins} phút nữa (${startTimeStr}) là bắt đầu việc rồi! Chuẩn bị nhé 💕`,
              taskId: t.id,
              isDue: false,
              timeStr: startTimeStr,
            });
          }
        }

        // 2. NHẮC ĐÚNG GIỜ (diffMins === 0 hoặc trễ tối đa 1 phút do sleep tab)
        if (diffMins <= 0 && diffMins >= -1) {
          const keyDue = `sc_notif_due_${t.id}_${todayKey}`;
          if (!localStorage.getItem(keyDue)) {
            localStorage.setItem(keyDue, 'true');
            sendNotification({
              title: `⏰ Đến giờ rồi: ${t.title}`,
              body: `Đã đến giờ bắt đầu (${startTimeStr}). Nhấp vào để hoàn thành nhé! 💖`,
              taskId: t.id,
              isDue: true,
              timeStr: startTimeStr,
            });
          }
        }
      });
    };

    // Check immediately on mount, then poll every 10 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 10000);

    return () => clearInterval(interval);
  }, []);

  // ── Upsert helper ─────────────────────────────────────────────────────────
  async function sbUpsertTask(task) {
    if (!isSupabaseReady) return;
    const { error } = await supabase.from('tasks').upsert(task);
    if (error) {
      console.error('Lỗi lưu công việc:', error);
      showToast('Lỗi lưu dữ liệu lên Database: ' + error.message, 'error');
    }
  }
  async function sbUpsertReview(review) {
    if (!isSupabaseReady) return;
    const { error } = await supabase.from('weekly_reviews').upsert(review);
    if (error) {
      console.error('Lỗi lưu đánh giá:', error);
      showToast('Lỗi lưu dữ liệu lên Database: ' + error.message, 'error');
    }
  }
  async function sbDeleteTask(id) {
    if (!isSupabaseReady) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Lỗi xóa công việc:', error);
      showToast('Lỗi xóa dữ liệu trên Database: ' + error.message, 'error');
    }
  }
  async function sbDeleteReview(id) {
    if (!isSupabaseReady) return;
    const { error } = await supabase.from('weekly_reviews').delete().eq('id', id);
    if (error) {
      console.error('Lỗi xóa đánh giá:', error);
      showToast('Lỗi xóa dữ liệu trên Database: ' + error.message, 'error');
    }
  }

  // ── Task operations ────────────────────────────────────────────────────────
  
  // task_logs (Instance) operations
  function getTaskLog(taskId, dateStr) {
    return taskLogs.find(l => l.task_id === taskId && l.target_date === dateStr);
  }

  function toggleTaskInstance(taskId, dateStr) {
    const existing = getTaskLog(taskId, dateStr);
    const newVal = existing ? !existing.is_completed : true;
    
    const log = existing 
      ? { ...existing, is_completed: newVal, updated_at: new Date().toISOString() }
      : { 
          id: nanoid(), 
          task_id: taskId, 
          couple_id: couple?.id, 
          target_date: dateStr, 
          is_completed: true,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

    setTaskLogs(prev => {
      const idx = prev.findIndex(l => l.id === log.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = log;
        return next;
      }
      return [...prev, log];
    });
    
    if (isSupabaseReady) {
      supabase.from('task_logs').upsert(log).then(({error}) => {
        if (error) console.error("Error upserting task log:", error);
      });
    }
  }
  toggleTaskInstanceRef.current = toggleTaskInstance;

  function updateTaskInstance(taskId, dateStr, updates) {
    const existing = getTaskLog(taskId, dateStr);
    const log = existing 
      ? { ...existing, ...updates, updated_at: new Date().toISOString() }
      : { 
          id: nanoid(), 
          task_id: taskId, 
          couple_id: couple?.id, 
          target_date: dateStr, 
          is_completed: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...updates
        };

    setTaskLogs(prev => {
      const idx = prev.findIndex(l => l.id === log.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = log;
        return next;
      }
      return [...prev, log];
    });
    
    if (isSupabaseReady) {
      supabase.from('task_logs').upsert(log).then(({error}) => {
        if (error) console.error("Error upserting task log:", error);
      });
    }
  }

  function deleteTaskInstance(taskId, dateStr) {
    updateTaskInstance(taskId, dateStr, { is_deleted: true });
  }

  // Old template operations
  function toggleTask(id) {
    setTasks(prev => {
      const next = prev.map(t =>
        t.id === id
          ? { ...t, is_completed: !t.is_completed, status: !t.is_completed ? 'DONE' : 'TODO' }
          : t
      );
      const updated = next.find(t => t.id === id);
      if (updated) sbUpsertTask(updated);
      return next;
    });
  }
  toggleTaskRef.current = toggleTask;

  function updateTask(id, updates) {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      const updated = next.find(t => t.id === id);
      if (updated) sbUpsertTask(updated);
      return next;
    });
  }

  function addTask(task) {
    const newTask = {
      id: nanoid(),
      is_completed: false,
      status: 'TODO',
      sort_order: tasks.length + 1,
      couple_id: couple?.id,
      ...task,
    };
    setTasks(prev => [...prev, newTask]);
    sbUpsertTask(newTask);
    return newTask;
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    sbDeleteTask(id);
  }

  function resetWeek() {
    // Determine the number of tasks actually assigned for the current week dynamically
    // based on taskLogs (for true weekly completion logic, this is an approximation)
    let totalAssigned = 0;
    let completedCount = 0;
    let sportCount = 0;

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const diff = now.getDate() - currentDay;
    const mon = new Date(now.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const dayTasks = tasks.filter(t => t.day === i);
      dayTasks.forEach(t => {
        const log = taskLogs.find(l => l.task_id === t.id && l.target_date === dateStr);
        if (!log?.is_deleted) {
          totalAssigned++;
          if (log?.is_completed) completedCount++;
          if (t.category === 'SPORT' && log?.is_completed) sportCount++;
        }
      });
    }

    const pct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
    const review = {
      id: nanoid(),
      week_label: getCurrentWeekLabel(),
      completion_rate: pct,
      sport_sessions: sportCount,
      rating: 3,
      good_things: '',
      improve_things: '',
      next_plan: '',
      couple_id: couple?.id,
      created_at: new Date().toISOString(),
    };
    addReview(review);
    // No need to reset tasks.is_completed anymore as we use task_logs!
    showToast('Đã lưu đánh giá tuần!', 'success');
  }

  function getCurrentWeekLabel() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `Tuần ${week} - Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  // ── Review operations ──────────────────────────────────────────────────────
  function addReview(review) {
    const r = { id: nanoid(), couple_id: couple?.id, created_at: new Date().toISOString(), ...review };
    setReviews(prev => [r, ...prev]);
    sbUpsertReview(r);
    return r;
  }

  function updateReview(id, updates) {
    setReviews(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      const updated = next.find(r => r.id === id);
      if (updated) sbUpsertReview(updated);
      return next;
    });
  }

  function deleteReview(id) {
    setReviews(prev => prev.filter(r => r.id !== id));
    sbDeleteReview(id);
  }

  // ── Computed stats ─────────────────────────────────────────────────────────
  const { totalTasks, completedTasks, bothTasks, progressPct } = useMemo(() => {
    let total = 0;
    let completed = 0;
    let both = 0;

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const diff = now.getDate() - currentDay;
    const mon = new Date(now.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const dayTasks = tasks.filter(t => t.day === i);
      dayTasks.forEach(t => {
        const log = taskLogs.find(l => l.task_id === t.id && l.target_date === dateStr);
        if (!log?.is_deleted) {
          total++;
          if (log?.is_completed) completed++;
          if (t.person === 'BOTH') both++;
        }
      });
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, bothTasks: both, progressPct: pct };
  }, [tasks, taskLogs]);

  // Combined Wallpapers (Custom uploaded + Presets)
  const allWallpapers = [...customWallpapers, ...PRESET_WALLPAPERS];

  const value = {
    tasks, taskLogs, reviews, activeTab, setActiveTab,
    isOnline: isSupabaseReady,
    totalTasks, completedTasks, bothTasks, progressPct,
    toggleTask, updateTask, addTask, deleteTask, resetWeek,
    toggleTaskInstance, updateTaskInstance, deleteTaskInstance,
    addReview, updateReview, deleteReview,
    wallpaper, setWallpaper,
    themeId, setThemeId,
    customWallpapers, addCustomWallpaper, deleteCustomWallpaper,
    WALLPAPERS: allWallpapers,
    activeNotification, dismissNotification, triggerTestNotification,
    notifPermission, requestNotifPermission, notificationHistory, clearNotification,
    sendNotification, quickLogWater,
    synced,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}






