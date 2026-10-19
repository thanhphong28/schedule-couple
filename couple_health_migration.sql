-- =========================================================================
-- MIGRATION: COUPLE HEALTH & WELLNESS ECOSYSTEM
-- Couple Schedule - Hệ thống theo dõi sức khỏe & Uống nước cho Cặp đôi
-- =========================================================================

-- 1. Mở rộng bảng health_profiles với các trường thể chất & thói quen
ALTER TABLE health_profiles
ADD COLUMN IF NOT EXISTS height numeric(5,1),
ADD COLUMN IF NOT EXISTS current_weight numeric(5,2),
ADD COLUMN IF NOT EXISTS target_weight numeric(5,2),
ADD COLUMN IF NOT EXISTS weight_date date,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS health_goal text DEFAULT 'maintain',
ADD COLUMN IF NOT EXISTS daily_water_goal int DEFAULT 2000,
ADD COLUMN IF NOT EXISTS water_reminder_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS water_reminder_start text DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS water_reminder_end text DEFAULT '21:00',
ADD COLUMN IF NOT EXISTS water_reminder_interval int DEFAULT 90,
ADD COLUMN IF NOT EXISTS share_water boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS share_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS share_weight boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_smartwatch boolean DEFAULT false;

-- 2. Bảng Nhật ký Uống nước (Water Logs)
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL, -- Đơn vị: ml (vd: 100, 200, 250, 500)
  log_date date NOT NULL, -- Ngày theo định dạng YYYY-MM-DD
  log_time timestamp with time zone DEFAULT timezone('utc'::text, now()),
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, log_date);

-- 3. Bảng Lịch sử Cân nặng (Weight Logs)
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  weight numeric(5,2) NOT NULL, -- Đơn vị: kg
  log_date date NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);

-- 4. Bảng Hoạt động Thể chất & Smartwatch (Activity Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  steps int DEFAULT 0,
  active_minutes int DEFAULT 0,
  calories_burned int DEFAULT 0,
  heart_rate_avg int,
  sleep_minutes int,
  source text DEFAULT 'manual', -- 'manual' | 'huafit_q5' | 'apple_health' | 'file_import'
  synced_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, activity_date, source)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, activity_date);

-- 5. Bảng Tương tác & Động viên Sức khỏe Cặp đôi (Couple Cheers)
CREATE TABLE IF NOT EXISTS couple_cheers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  cheer_type text NOT NULL, -- 'drink_water' | 'congrats' | 'hug' | 'workout'
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_couple_cheers_receiver ON couple_cheers(receiver_id, is_read);

-- 6. Tắt RLS để đồng bộ với cấu trúc hiện tại của dự án
ALTER TABLE water_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE couple_cheers DISABLE ROW LEVEL SECURITY;

-- 7. Kích hoạt Supabase Realtime cho các bảng mới
ALTER PUBLICATION supabase_realtime ADD TABLE water_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE weight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE couple_cheers;
