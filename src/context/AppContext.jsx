// context/AppContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getInitialTasks } from '../data/initialTasks.js';
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

export function AppProvider({ children }) {
  const [tasks, setTasksState] = useState(() => {
    const saved = lsGet(LS_TASKS);
    return saved && saved.length > 0 ? saved : getInitialTasks();
  });
  const [reviews, setReviewsState] = useState(() => lsGet(LS_REVIEWS) || []);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Persist to localStorage
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
    lsSet(LS_TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    lsSet(LS_REVIEWS, reviews);
  }, [reviews]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e) => {
      if (e.key === LS_TASKS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setTasksState(updated);
        } catch {}
      }
      if (e.key === LS_REVIEWS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setReviewsState(updated);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Task operations
  function toggleTask(id) {
    setTasksState(prev => prev.map(t =>
      t.id === id
        ? { ...t, is_completed: !t.is_completed, status: !t.is_completed ? 'DONE' : 'TODO' }
        : t
    ));
  }

  function updateTask(id, updates) {
    setTasksState(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function addTask(task) {
    const newTask = {
      id: nanoid(),
      is_completed: false,
      status: 'TODO',
      sort_order: tasks.length + 1,
      ...task,
    };
    setTasksState(prev => [...prev, newTask]);
    return newTask;
  }

  function deleteTask(id) {
    setTasksState(prev => prev.filter(t => t.id !== id));
  }

  function resetWeek() {
    // Save snapshot to reviews before reset
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
    setReviewsState(prev => [review, ...prev]);
    // Reset all tasks
    setTasksState(prev => prev.map(t => ({ ...t, is_completed: false, status: 'TODO' })));
  }

  function getCurrentWeekLabel() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `Tuần ${week} - Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  // Review operations
  function addReview(review) {
    const r = { id: nanoid(), created_at: new Date().toISOString(), ...review };
    setReviewsState(prev => [r, ...prev]);
    return r;
  }

  function updateReview(id, updates) {
    setReviewsState(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function deleteReview(id) {
    setReviewsState(prev => prev.filter(r => r.id !== id));
  }

  // Computed stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const bothTasks = tasks.filter(t => t.person === 'BOTH').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const value = {
    tasks, reviews, activeTab, setActiveTab, isLoading,
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
