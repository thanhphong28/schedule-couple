// context/AppContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getInitialTasks } from '../data/initialTasks.js';
import { isSupabaseReady, supabase } from '../lib/supabase.js';
import { nanoid, playNotificationChime } from '../lib/utils.js';
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
  const { user, couple } = useAuth();
  const [tasks, setTasks] = useState([]);
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
    localStorage.setItem(LS_THEME, id);
    
    

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
      setReviews([]);
      localStorage.setItem('sc_last_couple_id', currentCoupleId);
    }

    // Load initial data from Supabase
    if (!couple?.id) return;
    
    Promise.all([
      sbGetTasks(couple.id).catch(err => { console.warn('Tasks err', err); return null; }), 
      sbGetReviews(couple.id).catch(err => { console.warn('Reviews err', err); return null; }), 
      sbGetWallpapers(couple.id).catch(() => [])
    ]).then(([t, r, wps]) => {
      if (t) setTasks(t);
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

  useEffect(() => {
    if (!couple?.id) return;
    const taskSub = supabase
      .channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${couple.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Check if this task is genuinely new (not created locally by us just now)
          const isNewForMe = !tasks.some(t => t.id === payload.new.id);
          if (isNewForMe) {
            playNotificationChime();
            showToast('Nửa kia vừa thêm một công việc mới kìa! 📝', 'success');
          }
        }
        sbGetTasks(couple.id).then(setTasks).catch(console.error);
      })
      .subscribe();

    const reviewSub = supabase
      .channel('reviews-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_reviews', filter: `couple_id=eq.${couple.id}` }, () => {
        sbGetReviews(couple.id).then(setReviews).catch(console.error);
      })
      .subscribe();

    const wpSub = supabase
      .channel('wallpapers-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallpapers', filter: `couple_id=eq.${couple.id}` }, () => {
        sbGetWallpapers(couple.id).then(wps => {
          if (wps) {
            setCustomWallpapers(wps);
          }
        }).catch(console.error);
      })
      .subscribe();

    const userSub = supabase
      .channel('user-settings-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user?.id}` }, (payload) => {
        if (payload.new.theme_id) {
          setThemeIdRaw(payload.new.theme_id);
        }
        if (payload.new.wallpaper_id !== undefined) {
          setWallpaperRaw(payload.new.wallpaper_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(reviewSub);
      supabase.removeChannel(wpSub);
      supabase.removeChannel(userSub);
    };
  }, [couple, user]);

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

  // ── Browser & In-App Notifications ──────────────────────────────────────────
  const [activeNotification, setActiveNotification] = useState(null);
  const [notifPermission, setNotifPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';
  });

  const dismissNotification = () => setActiveNotification(null);

  // Auto-dismiss banner after 8.5 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  const requestNotifPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
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

  const sendNotification = ({ title, body, taskId, isDue, timeStr }) => {
    // 1. Pleasant soft audio chime
    playNotificationChime();

    // 2. In-App Floating Banner (guaranteed visibility on all devices)
    setActiveNotification({
      id: nanoid(),
      title,
      body,
      taskId,
      isDue,
      timeStr,
    });

    // 3. System Web Notification (if permission granted by browser)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: taskId ? `task-${taskId}-${isDue ? 'due' : '5m'}` : 'test',
          requireInteraction: true,
        });

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
  };

  const triggerTestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await requestNotifPermission();
    }
    sendNotification({
      title: '🧪 Thử nghiệm thông báo 💕',
      body: 'Hệ thống nhắc nhở trước 5 phút và đúng giờ đang hoạt động cực kỳ mượt mà trên máy của bạn!',
      taskId: null,
      isDue: false,
      timeStr: 'Bây giờ',
    });
  };

  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const toggleTaskRef = useRef(null);

  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      // 0=Mon, 1=Tue, ..., 6=Sun
      const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const nowTotalMins = currentHour * 60 + currentMin;
      const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      tasksRef.current.forEach(t => {
        if (t.day !== currentDay || t.is_completed || !t.time) return;

        // Parse start time "HH:mm" from "HH:mm" or "HH:mm - HH:mm"
        const startTimeStr = t.time.split('-')[0].trim();
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
    const completedCount = tasks.filter(t => t.is_completed).length;
    const sportCount = tasks.filter(t => t.category === 'SPORT' && t.is_completed).length;
    const pct = Math.round((completedCount / tasks.length) * 100);
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
    const reset = tasks.map(t => ({ ...t, is_completed: false, status: 'TODO' }));
    setTasks(reset);
    reset.forEach(t => sbUpsertTask(t));
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
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const bothTasks = tasks.filter(t => t.person === 'BOTH').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Combined Wallpapers (Custom uploaded + Presets)
  const allWallpapers = [...customWallpapers, ...PRESET_WALLPAPERS];

  const value = {
    tasks, reviews, activeTab, setActiveTab,
    isOnline: isSupabaseReady,
    totalTasks, completedTasks, bothTasks, progressPct,
    toggleTask, updateTask, addTask, deleteTask, resetWeek,
    addReview, updateReview, deleteReview,
    wallpaper, setWallpaper,
    themeId, setThemeId,
    customWallpapers, addCustomWallpaper, deleteCustomWallpaper,
    WALLPAPERS: allWallpapers,
    activeNotification, dismissNotification, triggerTestNotification,
    notifPermission, requestNotifPermission,
    synced,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}






