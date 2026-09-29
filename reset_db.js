import { createClient } from '@supabase/supabase-js';
import { getInitialTasks } from './src/data/initialTasks.js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetDB() {
  console.log("Wiping tasks table...");
  // Get all tasks to delete
  const { data: tasks } = await supabase.from('tasks').select('id');
  if (tasks && tasks.length > 0) {
    const ids = tasks.map(t => t.id);
    for (const id of ids) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  }

  console.log("Inserting new initial tasks...");
  const newTasks = getInitialTasks();
  const { error } = await supabase.from('tasks').insert(newTasks);
  
  if (error) {
    console.error("Error inserting tasks:", error);
  } else {
    console.log("✅ Successfully updated Supabase database with new schedule!");
  }
}

resetDB();
