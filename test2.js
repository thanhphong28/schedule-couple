import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Fetching one task to see schema...");
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
