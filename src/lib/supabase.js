// lib/supabase.js
// Supabase client with LocalStorage fallback

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (isSupabaseReady) {
  console.log('✅ Supabase connected! Real-time sync enabled.');
} else {
  console.log('ℹ️ Supabase not configured. Using LocalStorage fallback.');
}
