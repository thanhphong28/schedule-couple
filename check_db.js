import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("Fetching all tasks...");
  const { data, error } = await supabase.from('tasks').select('*');
  console.log("Error:", error);
  console.log("Tasks count:", data?.length);
  console.log("Tasks:", data);
}
check();
