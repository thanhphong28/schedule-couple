-- =========================================================================
-- MIGRATION 08: COUPLE LOVE COUNTER & SPECIAL D-DAY ANNIVERSARIES
-- Tính năng Đếm ngày yêu, Mốc kỷ niệm D-Day và Thông báo ghim cố định
-- File này an toàn tuyệt đối (Idempotent): Chạy nhiều lần không bao giờ bị lỗi
-- =========================================================================

-- 1. Bổ sung trường ngày bắt đầu yêu và cài đặt thông báo vào bảng couples
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS sticky_notification_enabled boolean DEFAULT false;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS sticky_notification_format text DEFAULT 'standard';
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS anniversary_title text DEFAULT 'Ngày chúng mình bắt đầu';

-- 2. Bảng lưu trữ các ngày kỷ niệm & sự kiện đặc biệt của cặp đôi (couple_special_dates)
CREATE TABLE IF NOT EXISTS public.couple_special_dates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,
  title text NOT NULL,                                  -- Tiêu đề: "Sinh nhật Nhật Thi", "Nụ hôn đầu", "Kỷ niệm cầu hôn"...
  event_date date NOT NULL,                             -- Ngày diễn ra (YYYY-MM-DD)
  category text DEFAULT 'custom',                       -- 'birthday_me' | 'birthday_partner' | 'anniversary' | 'first_kiss' | 'travel' | 'holiday' | 'custom'
  repeat_yearly boolean DEFAULT true,                   -- Lặp lại hàng năm (sinh nhật, ngày kỷ niệm)
  icon text DEFAULT '💖',                               -- Emoji biểu tượng
  notes text,                                           -- Ghi chú kỷ niệm
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Index để tìm kiếm nhanh theo couple_id
CREATE INDEX IF NOT EXISTS idx_couple_special_dates_couple ON public.couple_special_dates(couple_id, event_date);

-- 3. Tắt RLS để đồng bộ với cấu trúc client-side filter của dự án
ALTER TABLE public.couple_special_dates DISABLE ROW LEVEL SECURITY;

-- 4. Bật Realtime an toàn cho couple_special_dates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'couple_special_dates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_special_dates;
  END IF;
END $$;
