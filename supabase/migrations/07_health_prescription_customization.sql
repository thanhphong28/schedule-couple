-- =========================================================================
-- MIGRATION 07: HEALTH PRESCRIPTION & PERSONALIZED ROADMAP CUSTOMIZATION
-- Thêm các trường lưu trữ mục tiêu cá nhân hóa và phác đồ thể trạng
-- File này an toàn tuyệt đối (Idempotent): Chạy nhiều lần không bao giờ bị lỗi
-- =========================================================================

-- 1. Đảm bảo bảng health_profiles tồn tại trước khi thêm cột
CREATE TABLE IF NOT EXISTS public.health_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- 2. Bổ sung từng cột tùy biến phác đồ (viết rời từng lệnh để tránh lỗi syntax)
ALTER TABLE public.health_profiles ADD COLUMN IF NOT EXISTS target_date date;
ALTER TABLE public.health_profiles ADD COLUMN IF NOT EXISTS daily_calorie_target int;
ALTER TABLE public.health_profiles ADD COLUMN IF NOT EXISTS daily_step_goal int DEFAULT 8500;
ALTER TABLE public.health_profiles ADD COLUMN IF NOT EXISTS body_type_notes text;
ALTER TABLE public.health_profiles ADD COLUMN IF NOT EXISTS preferred_workout_style text DEFAULT 'balanced';

-- 3. Đảm bảo tắt RLS để đồng bộ với cấu trúc client-side filter của dự án
ALTER TABLE public.health_profiles DISABLE ROW LEVEL SECURITY;

-- 4. Bật Realtime an toàn (Kiểm tra xem bảng đã có trong publication chưa trước khi add để không bị lỗi trùng)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'health_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_profiles;
  END IF;
END $$;
