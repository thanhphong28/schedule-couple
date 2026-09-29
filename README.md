# SCHEDULE BELONG TO THI & PHONG

> Thoi khoa bieu & Ke hoach tuan danh rieng cho cap doi

---

## Tinh nang noi bat

- 📅 Lich & Hom Nay: Bang thoi khoa bieu 7 ngay × 8 khung gio + Tieu diem ngay hom nay
- 📋 Ke hoach tuan: 43 cong viec day du, bo loc theo nguoi/loai/trang thai, them/sua/xoa
- 📊 Dashboard: KPI dai han, bieu do Recharts, nhat ky danh gia tuan 1-5 stars
- Real-time Sync: Dong bo ngay lap tuc giua 2 tab/2 thiet bi qua LocalStorage events
- Supabase Ready: Cau hinh .env la co real-time sync qua internet cho 2 nguoi
- PWA-ready: Responsive 100%, hoat dong muot tren dien thoai & may tinh

---

## Chay local

```bash
npm install
npm run dev
```

Mo trinh duyet tai http://localhost:5173

---

## Deploy len Vercel (Mien phi, co HTTPS)

Buoc 1: Dua code len GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/schedule-thi-phong.git
git branch -M main
git push -u origin main
```

Buoc 2: Deploy len Vercel

1. Truy cap vercel.com -> Dang nhap bang GitHub
2. Click "Add New Project" -> Chon repo
3. Click "Deploy"
4. Co link dang: https://schedule-thi-phong.vercel.app

---

## Cau hinh Supabase (Real-time sync qua internet)

Khong bat buoc – App hoat dong binh thuong voi LocalStorage ngay ca khi khong co Supabase.
Chi can Supabase khi muon Thi va Phong dung tren 2 thiet bi khac nhau va thay doi ngay lap tuc.

Buoc 1: Tao Supabase project mien phi tai supabase.com

Buoc 2: Chay SQL nay trong Supabase SQL Editor:

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  time TEXT,
  title TEXT NOT NULL,
  person TEXT DEFAULT 'BOTH',
  category TEXT DEFAULT 'HOUSE',
  priority TEXT DEFAULT 'MEDIUM',
  is_completed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'TODO',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_reviews (
  id TEXT PRIMARY KEY,
  week_label TEXT NOT NULL,
  completion_rate INTEGER DEFAULT 0,
  sport_sessions INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 3,
  good_things TEXT DEFAULT '',
  improve_things TEXT DEFAULT '',
  next_plan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallpapers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE wallpapers;

CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON weekly_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON wallpapers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;
```

Buoc 3: Lay API Keys
- Settings -> API -> Project URL + anon public key

Buoc 4: Chinh sua file .env:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Buoc 5: Trong Vercel dashboard -> Settings -> Environment Variables
- Them VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY
- Save -> Vercel tu redeploy

---

## Cau truc project

```
SCHEDULE_COUPLE/
├── public/favicon.svg
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Badge.jsx          # Person/Category/Priority badges
│   │   │   └── TaskCard.jsx       # Task card + Edit modal
│   │   ├── tabs/
│   │   │   ├── Tab1Today.jsx      # Timetable + Today focus
│   │   │   ├── Tab2WeekPlan.jsx   # Master checklist
│   │   │   └── Tab3Dashboard.jsx  # KPI + Charts + Journal
│   │   └── Header.jsx             # Header + Scorecards + Tabs
│   ├── context/AppContext.jsx      # Global state
│   ├── data/initialTasks.js       # 43 default tasks
│   ├── lib/
│   │   ├── supabase.js            # Supabase client + LS fallback
│   │   └── utils.js               # Helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── index.html
└── vite.config.js
```

---

## Tech Stack

- React 18 + Vite 6
- Tailwind CSS v4 + Custom CSS animations
- Lucide React icons
- Recharts (ComposedChart)
- Supabase (Postgres + Real-time) / LocalStorage fallback
- Deploy: Vercel / Netlify (Free tier)

---

Made with love for Thi & Phong
