// lib/supabase.js
// Supabase client with LocalStorage fallback

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient = null;
let useLocalStorage = true;

// Try to initialize Supabase if credentials exist
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    useLocalStorage = false;
    console.log('✅ Supabase connected!');
  } catch (e) {
    console.warn('Supabase init failed, using LocalStorage fallback', e);
    useLocalStorage = true;
  }
}

// ============ LocalStorage helpers ============
const LS_TASKS = 'sc_tasks';
const LS_REVIEWS = 'sc_reviews';

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function lsListen(key, cb) {
  // Poll every 2 seconds for cross-tab sync (same device/same browser)
  const id = setInterval(() => {
    const val = lsGet(key);
    cb(val);
  }, 2000);
  return () => clearInterval(id);
}

// ============ Supabase real-time helpers ============
async function sbGetAll(table) {
  const { data, error } = await supabaseClient.from(table).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
async function sbUpsert(table, row) {
  const { data, error } = await supabaseClient.from(table).upsert(row).select();
  if (error) throw error;
  return data[0];
}
async function sbDelete(table, id) {
  const { error } = await supabaseClient.from(table).delete().eq('id', id);
  if (error) throw error;
}
async function sbInsert(table, row) {
  const { data, error } = await supabaseClient.from(table).insert(row).select();
  if (error) throw error;
  return data[0];
}

// ============ Exported DB API ============
export const db = {
  isOnline: !useLocalStorage,

  // TASKS
  async getTasks() {
    if (useLocalStorage) return lsGet(LS_TASKS) || [];
    return sbGetAll('tasks');
  },
  async saveTasks(tasks) {
    if (useLocalStorage) { lsSet(LS_TASKS, tasks); return; }
    // Upsert all
    for (const t of tasks) await sbUpsert('tasks', t);
  },
  async upsertTask(task) {
    if (useLocalStorage) {
      const all = lsGet(LS_TASKS) || [];
      const idx = all.findIndex(t => t.id === task.id);
      if (idx >= 0) all[idx] = task; else all.push(task);
      lsSet(LS_TASKS, all);
      return task;
    }
    return sbUpsert('tasks', task);
  },
  async deleteTask(id) {
    if (useLocalStorage) {
      const all = (lsGet(LS_TASKS) || []).filter(t => t.id !== id);
      lsSet(LS_TASKS, all);
      return;
    }
    return sbDelete('tasks', id);
  },

  // REVIEWS
  async getReviews() {
    if (useLocalStorage) return lsGet(LS_REVIEWS) || [];
    const { data, error } = await supabaseClient.from('weekly_reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async upsertReview(review) {
    if (useLocalStorage) {
      const all = lsGet(LS_REVIEWS) || [];
      const idx = all.findIndex(r => r.id === review.id);
      if (idx >= 0) all[idx] = review; else all.push(review);
      lsSet(LS_REVIEWS, all);
      return review;
    }
    return sbUpsert('weekly_reviews', review);
  },
  async deleteReview(id) {
    if (useLocalStorage) {
      const all = (lsGet(LS_REVIEWS) || []).filter(r => r.id !== id);
      lsSet(LS_REVIEWS, all);
      return;
    }
    return sbDelete('weekly_reviews', id);
  },

  // REAL-TIME SUBSCRIPTIONS
  subscribeTasks(cb) {
    if (useLocalStorage) return lsListen(LS_TASKS, (val) => cb(val || []));
    const sub = supabaseClient
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        sbGetAll('tasks').then(cb).catch(console.error);
      })
      .subscribe();
    return () => supabaseClient.removeChannel(sub);
  },
  subscribeReviews(cb) {
    if (useLocalStorage) return lsListen(LS_REVIEWS, (val) => cb(val || []));
    const sub = supabaseClient
      .channel('reviews-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_reviews' }, () => {
        this.getReviews().then(cb).catch(console.error);
      })
      .subscribe();
    return () => supabaseClient.removeChannel(sub);
  },
};
