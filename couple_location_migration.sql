-- =========================================================================
-- MIGRATION: COUPLE LIVE MAP & GEOLOCATION SHARING
-- Couple Schedule - Hệ thống chia sẻ vị trí thời gian thực cho Cặp đôi
-- =========================================================================

-- 1. Bảng lưu vị trí mới nhất của từng người dùng trong cặp đôi (Couple Locations)
CREATE TABLE IF NOT EXISTS couple_locations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy real,            -- Sai số GPS theo mét (vd: 5.2m)
  heading real,             -- Hướng di chuyển từ 0 đến 360 độ
  speed real,               -- Tốc độ m/s
  altitude real,            -- Độ cao mét
  is_sharing boolean DEFAULT true,
  battery_level int,        -- Mức pin 0-100% (nếu thiết bị hỗ trợ Battery API)
  is_charging boolean,      -- Trạng thái đang sạc
  address_name text,        -- Tên địa chỉ gần đúng (reverse geocoded)
  status_message text,      -- Trạng thái thủ công (vd: "Đang trên đường", "Đã về đến nhà")
  recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_couple_locations_couple ON couple_locations(couple_id);

-- 2. Bảng Địa điểm Yêu thích đã lưu của Cặp đôi (Saved Places)
CREATE TABLE IF NOT EXISTS saved_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,       -- "Nhà anh", "Nhà em", "Nơi hẹn hò đầu tiên", "Chỗ làm"
  category text DEFAULT 'home', -- 'home' | 'work' | 'dating' | 'school' | 'favorite'
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius int DEFAULT 150,   -- Bán kính vùng nhận diện (mét)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saved_places_couple ON saved_places(couple_id);

-- 3. Bảng Cấu hình Quyền riêng tư & Chế độ chia sẻ (Location Shares Config)
CREATE TABLE IF NOT EXISTS location_shares_config (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  is_sharing_enabled boolean DEFAULT true,
  share_mode text DEFAULT 'always', -- 'always' | 'duration' | 'paused'
  share_until timestamp with time zone,
  ghost_mode boolean DEFAULT false, -- Làm mờ vị trí chính xác nếu muốn
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Đồng bộ quyền bảo mật theo cấu trúc hiện tại của dự án
ALTER TABLE couple_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_shares_config DISABLE ROW LEVEL SECURITY;

-- 5. Kích hoạt Supabase Realtime cho các bảng vị trí
ALTER PUBLICATION supabase_realtime ADD TABLE couple_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_places;
ALTER PUBLICATION supabase_realtime ADD TABLE location_shares_config;
