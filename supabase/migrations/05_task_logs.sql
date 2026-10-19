CREATE TABLE IF NOT EXISTS task_logs (
  id text PRIMARY KEY,
  task_id text NOT NULL,
  couple_id uuid NOT NULL,
  target_date text NOT NULL,
  is_completed boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  new_time text,
  new_title text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(task_id, target_date)
);

-- Enable RLS
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on your actual auth logic, typically same as tasks)
CREATE POLICY "Enable ALL for authenticated users" ON task_logs FOR ALL USING (true) WITH CHECK (true);
