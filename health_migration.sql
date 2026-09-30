-- =========================================================================
-- MIGRATION: SMART MENSTRUAL CYCLE & COUPLE CARE
-- =========================================================================

-- 1. Bảng Health Profile: Lưu cấu hình chu kỳ và chia sẻ dữ liệu
CREATE TABLE IF NOT EXISTS health_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Cycle basic settings
  average_cycle_length int DEFAULT 28,
  average_period_length int DEFAULT 5,
  
  -- Sharing permissions (Female -> Male)
  share_cycle_phase boolean DEFAULT true, -- Cho phép xem giai đoạn (VD: Hành kinh, Rụng trứng)
  share_symptoms boolean DEFAULT false,   -- Cho phép xem chi tiết triệu chứng

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Mỗi user chỉ có 1 profile
  UNIQUE(user_id)
);

-- Bật Realtime cho health_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE health_profiles;


-- 2. Bảng Menstrual Cycles: Ghi nhận các chu kỳ
CREATE TABLE IF NOT EXISTS menstrual_cycles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  start_date date NOT NULL,
  end_date date, -- Ngày kết thúc ra máu
  
  cycle_length int, -- Tổng độ dài chu kỳ (tính từ start_date này đến start_date kỳ sau)
  period_length int, -- Tổng số ngày ra máu (tính khi kết thúc end_date)
  
  is_active boolean DEFAULT true, -- Đánh dấu chu kỳ hiện tại
  notes text,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bật Realtime cho menstrual_cycles
ALTER PUBLICATION supabase_realtime ADD TABLE menstrual_cycles;


-- 3. Bảng Symptoms Log: Ghi nhận triệu chứng hàng ngày
CREATE TABLE IF NOT EXISTS symptoms_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES menstrual_cycles(id) ON DELETE CASCADE,
  
  log_date date NOT NULL,
  
  -- Các loại triệu chứng (cramps, mood, fatigue, bloating, headache...)
  symptom_type text NOT NULL,
  
  -- Mức độ (none, mild, moderate, severe)
  severity text NOT NULL,
  
  notes text,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Mỗi ngày 1 loại triệu chứng chỉ được log 1 lần (để update thay vì insert mới)
  UNIQUE(user_id, log_date, symptom_type)
);

-- Bật Realtime cho symptoms_log
ALTER PUBLICATION supabase_realtime ADD TABLE symptoms_log;


-- =========================================================================
-- TRIGGER CẬP NHẬT updated_at
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_health_profiles_modtime
BEFORE UPDATE ON health_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_menstrual_cycles_modtime
BEFORE UPDATE ON menstrual_cycles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =========================================================================
-- BẢO MẬT: Bật RLS và gỡ bỏ RLS (Tuân thủ kiến trúc hiện tại của dự án: Disabled RLS)
-- Project hiện tại sử dụng client-side auth filter thay vì Supabase RLS.
-- =========================================================================
-- ALTER TABLE health_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE menstrual_cycles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE symptoms_log DISABLE ROW LEVEL SECURITY;
