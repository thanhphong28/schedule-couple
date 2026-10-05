<div align="center">
  <h1 align="center">💑 Couple Schedule & Master Plan</h1>
  <p align="center">
    A real-time, responsive, and beautifully designed weekly planner and schedule application built for couples.
  </p>
  
  <p align="center">
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  </p>
</div>

---

## 📖 Overview

**Couple Schedule** is a modern, real-time web application designed to help couples manage their shared routines, tasks, and weekly goals seamlessly. Whether it's organizing household chores, tracking fitness goals, or reviewing the week's highlights, this app provides a centralized, interactive dashboard to keep everything in sync.

Built with performance, maintainability, and user experience in mind, it utilizes **React 19**, **Tailwind CSS v4**, and **Supabase** for instant synchronization across devices. It also gracefully falls back to `localStorage` when offline or without backend configuration.

## ✨ Key Features

- ⚡ **Real-Time Synchronization**: Instant data updates across multiple devices and tabs using Supabase's Realtime capabilities.
- 📱 **PWA & Mobile First**: 100% responsive design, optimized for both desktop and mobile browsing with smooth custom CSS animations.
- 📅 **Interactive Timetable**: 7-day × 8-time-slot matrix with a dedicated "Today's Focus" view for daily alignment.
- 📋 **Master Checklist**: Manage a comprehensive list of shared tasks with advanced filtering by Person, Category, and Status. Supports full CRUD operations.
- 📊 **Analytical Dashboard**: Visualizes long-term KPIs and progress using interactive `recharts` charts.
- 📓 **Weekly Journal**: A reflective space to rate the week (1-5 stars), log highlights, note areas for improvement, and document upcoming plans.
- 🛡️ **Offline Support (Fallback)**: Seamlessly degrades to local browser storage (`localStorage`) if the backend is temporarily unavailable or not configured.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React (Icons)
- **Data Visualization**: Recharts
- **Backend & Database**: Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security)
- **Deployment**: Vercel / Netlify (PWA-ready)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/schedule-couple.git
   cd schedule-couple
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **View the app:**
   Open your browser and navigate to `http://localhost:5173`.

---

## ☁️ Backend Setup (Supabase)

The application works perfectly out of the box using `localStorage` for solo testing. However, to enable **real-time syncing** between multiple devices, you need to connect it to Supabase.

1. Create a free account and project at [Supabase](https://supabase.com/).
2. Run the database migration script in the Supabase SQL Editor:
   *(See `schema.sql` or `health_migration.sql` in the repository for the complete table setup and Row Level Security policies).*
3. Retrieve your API Keys from **Settings > API** (Project URL & `anon` public key).
4. Create a `.env` file in the root directory (you can copy `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## 📂 Project Architecture

```text
src/
├── components/
│   ├── shared/         # Reusable UI components (TaskCard, Badge, etc.)
│   ├── tabs/           # Main application views (Today, WeekPlan, Dashboard)
│   └── Header.jsx      # Navigation & Scorecards
├── context/
│   └── AppContext.jsx  # Global State Management
├── data/
│   └── initialTasks.js # Bootstrapping data
├── lib/
│   ├── supabase.js     # Supabase Client & Real-time setup
│   └── utils.js        # Helper functions
├── App.jsx             # Root Component
├── main.jsx            # Entry Point
└── index.css           # Global Styles & Tailwind Config
```

---

## 🌐 Deployment (Vercel)

Deploying to Vercel is highly recommended for optimal performance:

1. Push your code to your GitHub repository.
2. Log into [Vercel](https://vercel.com) and import your GitHub repository.
3. In the project settings, add the Environment Variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
4. Click **Deploy**. Your app will be live and auto-updating on future pushes!

---

<div align="center">
  <i>Developed with ❤️ for Thi & Phong</i>
</div>
