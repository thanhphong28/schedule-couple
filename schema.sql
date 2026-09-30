-- Bảng lưu trữ thông tin người dùng
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  full_name text,
  display_name text,
  dob text,
  gender text, -- 'MALE' | 'FEMALE'
  avatar_url text,
  couple_id uuid, -- Foreign key liên kết đến bảng couples
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bảng lưu trữ thông tin cặp đôi
CREATE TABLE IF NOT EXISTS couples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner1_id uuid REFERENCES users(id) ON DELETE CASCADE,
  partner2_id uuid REFERENCES users(id) ON DELETE CASCADE,
  love_code text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Thêm Foreign Key cho users.couple_id trỏ về couples
ALTER TABLE users 
ADD CONSTRAINT fk_couple 
FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;

-- Bảng lưu trữ lời mời kết nối
CREATE TABLE IF NOT EXISTS invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_username text,
  love_code text,
  status text DEFAULT 'PENDING',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bảng lưu trữ công việc/kế hoạch (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  title text NOT NULL,
  time text,
  assignee text, -- 'BOTH' | 'MALE' | 'FEMALE'
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bảng lưu trữ lịch sử đánh giá cuối ngày (Daily Reviews)
CREATE TABLE IF NOT EXISTS daily_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  date date NOT NULL,
  mood text, -- 'tuyệt vời' | 'bình thường' | 'tệ'
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tắt RLS (Row Level Security) cho toàn bộ các bảng để client thao tác tự do
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reviews DISABLE ROW LEVEL SECURITY;
