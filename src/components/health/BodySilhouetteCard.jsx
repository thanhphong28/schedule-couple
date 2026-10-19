// components/health/BodySilhouetteCard.jsx
// Phân Tích Thể Trạng & Phác Đồ Vóc Dáng Chuyên Sâu theo BMI Chuẩn Châu Á (WPRO)
// Tính toán động 100% dựa trên Cân nặng, Chiều cao, Tuổi, Giới tính & TDEE (Không hardcode)
// Thiết kế Mobile-First tối ưu, câu từ tôn trọng, tự động tính lại ngay khi Ghi Cân Mới
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, 
  Target, 
  Check, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Ruler, 
  Flame, 
  Droplets, 
  Footprints, 
  Utensils, 
  Moon, 
  Clock, 
  Zap, 
  Plus, 
  X, 
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';
import { calculateBMI, generatePersonalizedRoadmap } from '../../services/healthPersonalization.js';
import { showToast } from '../shared/Toast.jsx';

export default function BodySilhouetteCard({
  profile,
  gender = 'male', // 'male' | 'female'
  isMe = true,
  name = 'Bạn',
  partner,
  onUpdateProfile,
  onOpenWizard,
  onLogWeight
}) {
  const isMale = gender === 'male' || gender === 'MALE' || gender === 'Nam';

  // 1. Chỉ số thực tế từ Profile
  const height = profile?.height ? parseFloat(profile.height) : (isMale ? 170 : 158);
  const currentWeight = profile?.current_weight ? parseFloat(profile.current_weight) : (isMale ? 70 : 50);
  const targetWeight = profile?.target_weight ? parseFloat(profile.target_weight) : null;

  // State Modal Ghi Cân
  const [showLogModal, setShowLogModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Tính toán Phác Đồ Cá Nhân Hóa Động 100% (Không hardcode)
  const roadmap = useMemo(() => {
    return generatePersonalizedRoadmap({
      currentWeight,
      height,
      targetWeight,
      gender: isMale ? 'male' : 'female',
      birthDate: profile?.birth_date,
      activityLevel: profile?.activity_level || 'moderate',
      profile
    });
  }, [currentWeight, height, targetWeight, isMale, profile]);

  const bmiVal = roadmap.bmi;

  // 3. Theme màu sắc theo BMI (Lịch thiệp, không dùng từ "Béo phì")
  const theme = useMemo(() => {
    if (bmiVal < 18.5) {
      return {
        category: 'Gầy Nhẹ',
        color: '#38bdf8',
        border: 'border-sky-500/30',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        cardBg: 'from-sky-950/30 via-zinc-900 to-zinc-950',
        tagIcon: '⚡'
      };
    } else if (bmiVal <= 22.9) {
      return {
        category: 'Cân Đối',
        color: '#10b981',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        cardBg: 'from-emerald-950/30 via-zinc-900 to-zinc-950',
        tagIcon: '✨'
      };
    } else if (bmiVal <= 24.9) {
      return {
        category: 'Hơi Mũm Mĩm',
        color: '#f59e0b',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        cardBg: 'from-amber-950/30 via-zinc-900 to-zinc-950',
        tagIcon: '🍃'
      };
    } else {
      return {
        category: 'Thừa Cân',
        color: '#ef4444',
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        cardBg: 'from-rose-950/30 via-zinc-900 to-zinc-950',
        tagIcon: '🎯'
      };
    }
  }, [bmiVal]);

  // Mở modal ghi cân
  const handleOpenLogModal = () => {
    setInputWeight(currentWeight.toString());
    setInputNote('');
    setShowLogModal(true);
  };

  // Lưu cân nặng mới
  const handleSaveWeight = async (e) => {
    e?.preventDefault();
    const val = parseFloat(inputWeight);
    if (!val || val <= 30 || val >= 250) {
      showToast('Vui lòng nhập cân nặng hợp lệ (30kg - 250kg)', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onLogWeight) {
        await onLogWeight(val, inputNote);
      } else if (onUpdateProfile) {
        await onUpdateProfile({
          current_weight: val,
          weight_date: new Date().toISOString().split('T')[0]
        });
        showToast(`Đã lưu cân nặng mới: ${val} kg! ✨`, 'success');
      }
      setShowLogModal(false);
    } catch {
      showToast('Không thể lưu cân nặng, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dự đoán BMI nếu nhập số cân mới trong modal
  const simulatedBMI = useMemo(() => {
    const val = parseFloat(inputWeight);
    if (!val || !height) return null;
    const hM = height / 100;
    return (val / (hM * hM)).toFixed(1);
  }, [inputWeight, height]);

  // Vị trí kim chỉ trên dải phổ BMI (15 -> 35)
  const bmiSpectrumPercent = Math.min(97, Math.max(3, ((bmiVal - 15) / (35 - 15)) * 100));

  return (
    <div className={`glass-panel p-3.5 sm:p-5 rounded-[28px] sm:rounded-[32px] border relative overflow-hidden transition-all duration-300 shadow-xl ${
      isMale ? 'border-cyan-500/25 shadow-cyan-500/10' : 'border-rose-500/25 shadow-rose-500/10'
    }`}>
      {/* Background ambient lighting */}
      <div 
        className={`absolute top-0 right-0 w-72 h-72 blur-3xl rounded-full pointer-events-none opacity-20 ${
          bmiVal >= 25 ? 'bg-rose-500' : (isMale ? 'bg-cyan-500' : 'bg-rose-500')
        }`} 
      />

      {/* ─── 1. HEADER CHÍNH (MOBILE-FIRST) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 px-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-lg font-black text-white shrink-0 ${
            isMale 
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/30' 
              : 'bg-gradient-to-tr from-rose-500 to-pink-500 shadow-rose-500/30'
          }`}>
            <Activity size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                Phác Đồ &amp; Thể Trạng
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border flex items-center gap-1 whitespace-nowrap ${theme.badge}`}>
                <span>{theme.tagIcon}</span>
                <span>{theme.category}</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium truncate mt-0.5">
              {isMe ? `Hồ sơ cá nhân (${name})` : `Hồ sơ của ${name}`} · Chuẩn Châu Á (WPRO)
            </p>
          </div>
        </div>

        {/* Nút Ghi Cân: Chỉ hiển thị cho bản thân */}
        {isMe ? (
          <button
            type="button"
            onClick={handleOpenLogModal}
            className={`self-end sm:self-auto px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 border shadow-md shrink-0 ${
              isMale
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-500/25'
                : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white border-rose-400/40 shadow-rose-500/25'
            }`}
          >
            <Plus size={14} />
            <span>Ghi cân</span>
          </button>
        ) : (
          <span className="self-end sm:self-auto text-[10px] font-bold text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-xl border border-white/5">
            Xem hồ sơ đôi
          </span>
        )}
      </div>

      {/* ─── 2. HÀNG 4 CHỈ SỐ NHÂN TRẮC HỌC (GRID RESPONSIVE) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Chiều cao */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/70 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Chiều cao</span>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg sm:text-xl font-black text-white">{height}</span>
            <span className="text-[10px] sm:text-xs text-zinc-400 font-bold">cm</span>
          </div>
          <span className="text-[9px] text-cyan-400 font-bold block mt-0.5">Thước đo chuẩn</span>
        </div>

        {/* Cân nặng hiện tại */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/70 rounded-2xl border border-white/5 text-center relative overflow-hidden">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Cân hiện tại</span>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg sm:text-xl font-black text-white">{currentWeight}</span>
            <span className="text-[10px] sm:text-xs text-zinc-400 font-bold">kg</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-medium block mt-0.5 truncate">
            {profile?.weight_date ? `Đo: ${profile.weight_date}` : 'Gần nhất'}
          </span>
        </div>

        {/* Cân nặng mục tiêu */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/70 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Cân mục tiêu</span>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg sm:text-xl font-black text-purple-300">{roadmap.targetWeight}</span>
            <span className="text-[10px] sm:text-xs text-zinc-400 font-bold">kg</span>
          </div>
          <span className="text-[9px] text-purple-400 font-bold block mt-0.5 truncate">
            Chuẩn: {roadmap.idealRange.min}-{roadmap.idealRange.max}kg
          </span>
        </div>

        {/* Chỉ số BMI */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/70 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Chỉ số BMI</span>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className={`text-lg sm:text-xl font-black ${
              bmiVal >= 25 ? 'text-rose-400' : (bmiVal >= 23 ? 'text-amber-400' : 'text-emerald-400')
            }`}>
              {bmiVal}
            </span>
          </div>
          <span className={`text-[9px] font-black block mt-0.5 truncate ${
            bmiVal >= 25 ? 'text-rose-400' : (bmiVal >= 23 ? 'text-amber-400' : 'text-emerald-400')
          }`}>
            {theme.category}
          </span>
        </div>
      </div>

      {/* ─── 3. THANG PHỔ BMI CHUẨN CHÂU Á (WPRO SPECTRUM BAR) ─── */}
      <div className="p-3 sm:p-3.5 bg-zinc-900/60 rounded-2xl border border-white/5 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-zinc-300 mb-2">
          <span className="flex items-center gap-1.5">
            <Scale size={13} className="text-cyan-400" />
            <span>Thang Phổ BMI Châu Á</span>
          </span>
          <span className="font-mono text-white text-[11px] font-black">
            BMI: {bmiVal} · {theme.category}
          </span>
        </div>

        {/* Thanh màu Spectrum */}
        <div className="relative w-full h-3 rounded-full overflow-hidden bg-zinc-800 flex shadow-inner">
          {/* Thiếu cân (<18.5) */}
          <div style={{ width: '17.5%' }} className="h-full bg-sky-500" title="Gầy (<18.5)" />
          {/* Chuẩn (18.5 - 22.9) */}
          <div style={{ width: '22%' }} className="h-full bg-emerald-500" title="Cân đối (18.5 - 22.9)" />
          {/* Mũm mĩm (23.0 - 24.9) */}
          <div style={{ width: '10%' }} className="h-full bg-amber-500" title="Mũm mĩm (23 - 24.9)" />
          {/* Thừa cân (25.0 - 29.9) */}
          <div style={{ width: '25%' }} className="h-full bg-orange-500" title="Thừa cân (25 - 29.9)" />
          {/* Thừa cân nhiều (>=30) */}
          <div style={{ width: '25.5%' }} className="h-full bg-rose-600" title="Thừa cân (>=30)" />
        </div>

        {/* Kim chỉ vị trí BMI hiện tại */}
        <div className="relative w-full h-4 mt-1">
          <div 
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
            style={{ left: `${bmiSpectrumPercent}%` }}
          >
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-white" />
            <span className="text-[8px] sm:text-[9px] font-mono font-black text-white px-1.5 py-0.2 rounded bg-zinc-800 border border-white/20 whitespace-nowrap shadow-md">
              {bmiVal}
            </span>
          </div>
        </div>

        {/* Chú thích các mốc chuẩn */}
        <div className="grid grid-cols-4 text-[9px] sm:text-[10px] text-zinc-400 font-medium pt-1 text-center border-t border-zinc-800/60 mt-1">
          <div><span className="text-sky-400 font-bold">&lt;18.5</span> Gầy</div>
          <div><span className="text-emerald-400 font-bold">18.5-22.9</span> Chuẩn</div>
          <div><span className="text-amber-400 font-bold">23-24.9</span> Mũm mĩm</div>
          <div><span className="text-rose-400 font-bold">&ge;25</span> Thừa cân</div>
        </div>
      </div>

      {/* ─── 4. KHỐI TIẾN TRÌNH & THỜI GIAN VỀ ĐÍCH (ĐỘNG THEO CHỈ SỐ) ─── */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border bg-gradient-to-b ${theme.cardBg} ${theme.border} mb-3 space-y-2.5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Target size={15} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white">
                {roadmap.isLosing ? 'Mục Tiêu Giảm Cân Khoa Học' : (roadmap.isGaining ? 'Mục Tiêu Tăng Thể Trọng' : 'Vóc Dáng Chuẩn Cân Đối')}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 font-medium">
                {roadmap.isLosing 
                  ? `Mục tiêu giảm ${roadmap.kgGap} kg về mốc ${roadmap.targetWeight} kg (TDEE: ${roadmap.tdee} kcal)` 
                  : (roadmap.isGaining 
                      ? `Mục tiêu tăng ${roadmap.kgGap} kg về mốc ${roadmap.targetWeight} kg` 
                      : 'Thể trạng lý tưởng, duy trì phong độ hiện tại')}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white border border-white/10">
            {roadmap.safeRateText}
          </span>
        </div>

        {/* 3 Thẻ chỉ số tổng quan lộ trình */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
          {/* Chênh lệch kg */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block mb-0.5">Chênh lệch</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className={`text-base sm:text-lg font-black ${roadmap.isLosing ? 'text-rose-400' : (roadmap.isGaining ? 'text-sky-400' : 'text-emerald-400')}`}>
                {roadmap.kgGap > 0 ? (roadmap.isLosing ? `-${roadmap.kgGap}` : `+${roadmap.kgGap}`) : '0'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold">kg</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-zinc-400">
              {roadmap.isLosing ? 'cần giảm' : (roadmap.isGaining ? 'cần tăng' : 'chuẩn')}
            </span>
          </div>

          {/* Thời gian hoàn thành */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block mb-0.5">Thời gian</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-base sm:text-lg font-black text-purple-300">
                {roadmap.weeksNeeded > 0 ? `~${roadmap.weeksNeeded}` : '0'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold">tuần</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-purple-300 font-medium">
              {roadmap.monthsNeeded > 0 ? `(${roadmap.monthsNeeded} th)` : 'về đích'}
            </span>
          </div>

          {/* Mục tiêu Calo nạp mỗi ngày */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-white/10 text-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block mb-0.5">Nạp Calo/ngày</span>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-base sm:text-lg font-black text-amber-400">
                {roadmap.dailyCalorieTarget}
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold">kcal</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-amber-300 font-medium">
              {roadmap.deficitKcal > 0 ? `(-${roadmap.deficitKcal} kcal)` : (roadmap.deficitKcal < 0 ? `(+${Math.abs(roadmap.deficitKcal)} kcal)` : 'cân bằng')}
            </span>
          </div>
        </div>

        {/* Thông báo cá nhân hóa theo giới tính */}
        <div className="pt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-300 font-medium">
          <ShieldCheck size={12} className={isMale ? 'text-cyan-400' : 'text-rose-400'} />
          <span>{roadmap.genderNotice}</span>
        </div>
      </div>

      {/* ─── 5. MỤC TIÊU HÀNH ĐỘNG MỖI NGÀY (DAILY ACTION BLUEPRINT ĐỘNG 100%) ─── */}
      <div className="p-3.5 sm:p-4 bg-zinc-900/80 rounded-2xl border border-white/10 space-y-2.5 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarCheck size={14} />
            </div>
            <h4 className="text-xs sm:text-sm font-black text-white">
              Kế Hoạch Thực Hiện Mỗi Ngày
            </h4>
          </div>
          <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Duy trì đều đặn để đạt cân
          </span>
        </div>

        {/* 4 Thẻ Mục Tiêu Thực Hành Mỗi Ngày (Tính theo chỉ số cá nhân) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Mục tiêu 1: Calo */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/70 border border-amber-500/20 flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Flame size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white truncate">Mục tiêu Calo</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                  {roadmap.dailyCalorieTarget} kcal/ngày
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed font-medium">
                {roadmap.deficitKcal > 0 
                  ? `Thâm hụt -${roadmap.deficitKcal} kcal/ngày so với mức tiêu hao TDEE (${roadmap.tdee} kcal). BMR: ${roadmap.bmr} kcal.`
                  : (roadmap.deficitKcal < 0 
                      ? `Thặng dư +${Math.abs(roadmap.deficitKcal)} kcal/ngày để bồi bổ cơ bắp nạc.` 
                      : `Ăn mức năng lượng cân bằng TDEE (${roadmap.tdee} kcal) giữ vóc dáng.`)}
              </p>
            </div>
          </div>

          {/* Mục tiêu 2: Uống Nước Động theo cân nặng */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/70 border border-cyan-500/20 flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <Droplets size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white truncate">Mục tiêu Nước lọc</span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 shrink-0">
                  {roadmap.waterTargetMl} ml / ngày
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed font-medium">
                Tính chuẩn theo thể trọng {currentWeight}kg. Uống 1 cốc ấm trước mỗi bữa ăn 20 phút giúp kiểm soát khẩu phần tốt hơn.
              </p>
            </div>
          </div>

          {/* Mục tiêu 3: Vận động / Bước chân Động theo BMI */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/70 border border-purple-500/20 flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Footprints size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white truncate">Vận động thể chất</span>
                <span className="text-[10px] font-mono font-bold text-purple-300 shrink-0">
                  {roadmap.dailySteps.toLocaleString()} bước
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed font-medium">
                {roadmap.stepAdvice}
              </p>
            </div>
          </div>

          {/* Mục tiêu 4: Đạm & Dinh dưỡng Động */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-950/70 border border-emerald-500/20 flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Utensils size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white truncate">Lượng Protein cần</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                  ~{roadmap.targetProteinGrams}g đạm / ngày
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed font-medium">
                Đủ đạm giúp bảo tồn cơ bắp và đốt mỡ. Ưu tiên ức gà, cá, trứng, đậu hũ và rau xanh giàu xơ.
              </p>
            </div>
          </div>
        </div>

        {/* Lời khuyên giấc ngủ */}
        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center gap-2 text-[11px] text-zinc-300">
          <Moon size={15} className="text-indigo-400 shrink-0" />
          <span className="leading-snug">
            <b className="text-indigo-300">Giấc ngủ sinh học: </b>
            Ngủ đủ 7-8 tiếng, đi ngủ trước 23:00 giúp hạ hormone Cortisol (nguyên nhân gây tích mỡ bụng).
          </span>
        </div>
      </div>

      {/* ─── 6. LỘ TRÌNH TỪNG GIAI ĐOẠN ĐỘNG (ROADMAP PHASES) ─── */}
      <div className="p-3 sm:p-3.5 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-2">
        <span className="text-xs font-black text-white flex items-center gap-1.5">
          <Clock size={13} className="text-cyan-400" />
          <span>Lộ Trình Các Giai Đoạn Về Đích</span>
        </span>

        <div className="space-y-1.5">
          {roadmap.phases.map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white">{item.title}</span>
                  <span className="text-[10px] text-cyan-300 font-mono font-bold">{item.phase}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-medium">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 7. MODAL GHI CÂN HÔM NAY (QUICK LOG WEIGHT MODAL) ─── */}
      {showLogModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/15 rounded-[28px] p-4 sm:p-5 shadow-2xl space-y-3.5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Scale size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ghi Cân Nặng Mới</h3>
                  <p className="text-[10px] text-zinc-400">Tự tính lại BMI &amp; cập nhật phác đồ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Input Cân Nặng */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">
                Cân nặng đo được hôm nay (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  autoFocus
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  placeholder="Ví dụ: 74.5"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-2xl font-black text-white text-center tracking-wide focus:outline-none transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">
                  kg
                </span>
              </div>

              {/* Nút điều chỉnh nhanh +/- */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                {[-1.0, -0.5, -0.2, +0.2, +0.5, +1.0].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(inputWeight) || currentWeight;
                      setInputWeight((Math.round((cur + step) * 10) / 10).toString());
                    }}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-mono font-bold active:scale-95 transition-all"
                  >
                    {step > 0 ? `+${step}` : step}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <input
                type="text"
                value={inputNote}
                onChange={(e) => setInputNote(e.target.value)}
                placeholder="Ví dụ: Cân sáng sớm sau khi thức dậy..."
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors"
              />
            </div>

            {/* Dự báo BMI mới tức thì */}
            {simulatedBMI && (
              <div className="p-2.5 sm:p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium text-[11px]">Dự kiến BMI sau ghi:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-white">{simulatedBMI}</span>
                  {parseFloat(simulatedBMI) < bmiVal && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center">
                      <TrendingDown size={12} /> Giảm {(bmiVal - parseFloat(simulatedBMI)).toFixed(1)} 📉
                    </span>
                  )}
                  {parseFloat(simulatedBMI) > bmiVal && (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center">
                      <TrendingUp size={12} /> Tăng {(parseFloat(simulatedBMI) - bmiVal).toFixed(1)} 📈
                    </span>
                  )}
                  {parseFloat(simulatedBMI) === bmiVal && (
                    <span className="text-[10px] font-bold text-zinc-400">
                      Không đổi
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Nút Submit */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveWeight}
                className={`flex-1 py-2.5 sm:py-3 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                  isMale 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/25' 
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/25'
                }`}
              >
                <Check size={14} />
                <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận & Cập nhật'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
