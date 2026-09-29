import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const task = {
    id: "test-id-123",
    day: 1,
    time: "10:00 - 11:00",
    title: "Test Task with Day",
    person: "BOTH",
    category: "HOUSE",
    priority: "MEDIUM",
    is_completed: false,
    status: "TODO",
    sort_order: 999
  };
  
  console.log("Upserting complete task...");
  const { data, error } = await supabase.from('tasks').upsert(task);
  console.log("Error:", error);
  console.log("Data:", data);
  
  if (!error) {
    await supabase.from('tasks').delete().eq('id', 'test-id-123');
  }
}

test();
