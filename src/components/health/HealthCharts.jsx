// components/health/HealthCharts.jsx
// Biểu đồ xu hướng sức khỏe từ dữ liệu thật (Uống nước 7 ngày & Cân nặng)
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { BarChart2, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export default function HealthCharts({
  weeklyWaterHistory = [],
  weightLogs = [],
  myWaterGoal = 2000
}) {
  // Chuẩn bị dữ liệu 7 ngày nước uống thực tế
  const waterChartData = useMemo(() => {
    // Tạo mốc 7 ngày từ quá khứ đến hôm nay
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Hôm nay' : `${d.getDate()}/${d.getMonth() + 1}`;

      // Tính tổng ml trong ngày dateStr từ weeklyWaterHistory
      const dayLogs = weeklyWaterHistory.filter(l => l.log_date === dateStr);
      const total = dayLogs.reduce((sum, l) => sum + (parseInt(l.amount, 10) || 0), 0);

      days.push({
        date: dateStr,
        name: dayName,
        amount: total,
        goal: myWaterGoal
      });
    }
    return days;
  }, [weeklyWaterHistory, myWaterGoal]);

  // Chuẩn bị dữ liệu cân nặng từ weightLogs (sắp xếp tăng dần theo ngày để vẽ đường)
  const weightChartData = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return [];
    return [...weightLogs]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map(w => ({
        date: w.log_date,
        name: w.log_date ? `${w.log_date.split('-')[2]}/${w.log_date.split('-')[1]}` : '',
        weight: parseFloat(w.weight)
      }));
  }, [weightLogs]);

  return (
    <div className="space-y-4">
      {/* 1. Biểu đồ Uống nước 7 ngày */}
      <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-sky-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Uống Nước 7 Ngày Gần Nhất (ml)
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400">Mục tiêu: {myWaterGoal} ml</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={[0, 'dataMax + 500']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  borderColor: 'rgba(56,189,248,0.4)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  color: '#fff'
                }}
                formatter={(val) => [`${val.toLocaleString()} ml`, 'Đã uống']}
              />
              <ReferenceLine y={myWaterGoal} stroke="#38bdf8" strokeDasharray="3 3" opacity={0.6} />
              <Bar dataKey="amount" fill="#0ea5e9" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Biểu đồ Xu hướng Cân nặng */}
      <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Xu Hướng Cân Nặng (kg)
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400">{weightChartData.length} mốc ghi nhận</span>
        </div>

        {weightChartData.length >= 2 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: 'rgba(168,85,247,0.4)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                  formatter={(val) => [`${val} kg`, 'Cân nặng']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#c084fc' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-500 flex flex-col items-center justify-center">
            <AlertCircle size={22} className="mb-1 text-zinc-600" />
            <p className="text-xs">Cần ít nhất 2 ngày ghi nhận cân nặng để hiển thị biểu đồ xu hướng</p>
          </div>
        )}
      </div>
    </div>
  );
}
