// context/AppContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  const { user, couple } = useAuth();
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

    const taskLogsSub = supabase
      .channel('task-logs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_logs', filter: `couple_id=eq.${couple.id}` }, () => {
        sbGetTaskLogs(couple.id).then(setTaskLogs).catch(console.error);
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
      supabase.removeChannel(taskLogsSub);
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

    const notifData = {
      id: nanoid(),
      title,
      body,
      taskId,
      isDue,
      timeStr,
      timestamp: Date.now(),
    };

    // 2. In-App Floating Banner (guaranteed visibility on all devices)
    setActiveNotification(notifData);
    addNotificationToHistory(notifData);

    // 3. System Web Notification (if permission granted by browser)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notifOptions = {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: taskId ? `task-${taskId}-${isDue ? 'due' : '5m'}` : 'test',
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
  const taskLogsRef = useRef(taskLogs);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { taskLogsRef.current = taskLogs; }, [taskLogs]);

  const toggleTaskRef = useRef(null);
  const toggleTaskInstanceRef = useRef(null);

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
    synced,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}






