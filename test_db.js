import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const task = {
    id: "test-id",
    title: "Test Task",
    is_completed: false,
    status: "TODO",
    sort_order: 999
  };
  
  console.log("Upserting task...");
  const { data, error } = await supabase.from('tasks').upsert(task);
  console.log("Error:", error);
  console.log("Data:", data);
  
  if (!error) {
    await supabase.from('tasks').delete().eq('id', 'test-id');
  }
}

test();
