// context/AppContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getInitialTasks } from '../data/initialTasks.js';
import { isSupabaseReady, supabase } from '../lib/supabase.js';
import { nanoid } from '../lib/utils.js';

const AppContext = createContext(null);

const LS_TASKS = 'sc_tasks_v2';
const LS_REVIEWS = 'sc_reviews_v2';

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbGetTasks() {
  const { data, error } = await supabase
    .from('tasks').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
async function sbGetReviews() {
  const { data, error } = await supabase
    .from('weekly_reviews').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function AppProvider({ children }) {
  const [tasks, setTasksRaw] = useState(() => {
    const saved = lsGet(LS_TASKS);
    return saved && saved.length > 0 ? saved : getInitialTasks();
  });
  const [reviews, setReviewsRaw] = useState(() => lsGet(LS_REVIEWS) || []);
  const [activeTab, setActiveTab] = useState(0);
  const [synced, setSynced] = useState(false); // true after first Supabase load

  // ── Persist to localStorage ────────────────────────────────────────────────
  function setTasks(val) {
    setTasksRaw(val);
    lsSet(LS_TASKS, val);
  }
  function setReviews(val) {
    setReviewsRaw(val);
    lsSet(LS_REVIEWS, val);
  }

  // ── On mount: load from Supabase (if configured) ──────────────────────────
  useEffect(() => {
    if (!isSupabaseReady) {
      // Cross-tab sync via storage event
      const handler = (e) => {
        if (e.key === LS_TASKS && e.newValue) {
          try { setTasksRaw(JSON.parse(e.newValue)); } catch {}
        }
        if (e.key === LS_REVIEWS && e.newValue) {
          try { setReviewsRaw(JSON.parse(e.newValue)); } catch {}
        }
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }

    // Load initial data from Supabase
    Promise.all([sbGetTasks(), sbGetReviews()]).then(([t, r]) => {
      if (t.length > 0) setTasks(t); // prefer remote data
      if (r.length > 0) setReviews(r);
      setSynced(true);
    }).catch(err => {
      console.warn('Supabase load failed, using localStorage', err);
      setSynced(true);
    });

    // Real-time subscriptions
    const taskSub = supabase
      .channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        sbGetTasks().then(setTasks).catch(console.error);
      })
      .subscribe();

    const reviewSub = supabase
      .channel('reviews-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_reviews' }, () => {
        sbGetReviews().then(setReviews).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(reviewSub);
    };
  }, []);

  // ── Browser Notifications ──────────────────────────────────────────────────
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const toggleTaskRef = useRef(null);

  useEffect(() => {
    if (!('Notification' in window)) return;
    
    const interval = setInterval(() => {
      if (Notification.permission !== 'granted') return;
      
      const now = new Date();
      const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

      tasksRef.current.forEach(t => {
        if (t.day === currentDay && !t.is_completed && t.time) {
          const startTime = t.time.split('-')[0].trim();
          
          if (startTime === currentTimeStr) {
            const notifiedKey = `notified_${t.id}_${now.toDateString()}`;
            if (!sessionStorage.getItem(notifiedKey)) {
              sessionStorage.setItem(notifiedKey, 'true');
              
              const notif = new Notification("⏰ Đến giờ rồi: " + t.title, {
                body: "Nhấp vào đây để đánh dấu hoàn thành luôn nhé! 💖",
                icon: '/favicon.ico',
                requireInteraction: true
              });
              
              notif.onclick = () => {
                window.focus();
                if (toggleTaskRef.current) toggleTaskRef.current(t.id);
                notif.close();
              };
            }
          }
        }
      });
    }, 15000); // Check every 15s

    return () => clearInterval(interval);
  }, []);

  // ── Upsert helper ─────────────────────────────────────────────────────────
  async function sbUpsertTask(task) {
    if (!isSupabaseReady) return;
    await supabase.from('tasks').upsert(task);
  }
  async function sbUpsertReview(review) {
    if (!isSupabaseReady) return;
    await supabase.from('weekly_reviews').upsert(review);
  }
  async function sbDeleteTask(id) {
    if (!isSupabaseReady) return;
    await supabase.from('tasks').delete().eq('id', id);
  }
  async function sbDeleteReview(id) {
    if (!isSupabaseReady) return;
    await supabase.from('weekly_reviews').delete().eq('id', id);
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
    const r = { id: nanoid(), created_at: new Date().toISOString(), ...review };
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

  const value = {
    tasks, reviews, activeTab, setActiveTab,
    isOnline: isSupabaseReady,
    totalTasks, completedTasks, bothTasks, progressPct,
    toggleTask, updateTask, addTask, deleteTask, resetWeek,
    addReview, updateReview, deleteReview,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
