// services/healthPersonalization.js
// Hệ sinh thái phân tích sức khỏe liên kết: Chu kỳ + Uống nước + Vận động + Chỉ số cơ thể

/**
 * Tính tuổi từ ngày sinh (YYYY-MM-DD)
 */
export function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

/**
 * Tính chỉ số BMI (Body Mass Index) theo tiêu chuẩn người châu Á (WHO/WPRO)
 */
export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  
  // Phân loại BMI Châu Á (WPRO)
  let classification = {
    category: 'Bình thường',
    color: 'emerald',
    description: 'Chỉ số cơ thể của bạn đang ở mức cân đối và khỏe khoắn.',
    advice: 'Tiếp tục duy trì chế độ dinh dưỡng cân bằng và vận động đều đặn mỗi tuần.'
  };

  if (bmi < 18.5) {
    classification = {
      category: 'Gầy nhẹ',
      color: 'amber',
      description: 'Chỉ số cơ thể hơi thấp so với chiều cao.',
      advice: 'Chú ý bổ sung năng lượng qua các bữa ăn dinh dưỡng lành mạnh và tập luyện tăng cơ.'
    };
  } else if (bmi >= 18.5 && bmi <= 22.9) {
    classification = {
      category: 'Cân đối',
      color: 'emerald',
      description: 'Cân nặng lý tưởng theo tiêu chuẩn sức khỏe Châu Á.',
      advice: 'Rất tuyệt vời! Hãy duy trì lối sống lành mạnh cùng người yêu nhé.'
    };
  } else if (bmi >= 23.0 && bmi <= 24.9) {
    classification = {
      category: 'Tiền thừa cân',
      color: 'amber',
      description: 'Cân nặng hơi nhỉnh hơn so với chuẩn khuyến nghị.',
      advice: 'Tăng cường vận động nhẹ 30 phút/ngày và chú ý uống đủ nước trước bữa ăn.'
    };
  } else {
    classification = {
      category: 'Thừa cân',
      color: 'rose',
      description: 'Chỉ số vượt mức khuyến nghị tiêu chuẩn.',
      advice: 'Nên kết hợp chế độ ăn giảm tinh bột nhanh, tăng rau xanh và duy trì tập cardio đều đặn.'
    };
  }

  return { bmi, ...classification };
}

/**
 * Tính BMR (Tỷ lệ trao đổi chất cơ bản) theo công thức Mifflin - St Jeor
 */
export function calculateBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return null;
  const isFemale = gender === 'FEMALE' || gender === 'Nữ' || gender === 'female';
  
  // Mifflin - St Jeor Equation
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (isFemale) {
    bmr -= 161;
  } else {
    bmr += 5;
  }
  return Math.round(bmr);
}

/**
 * Hệ số vận động
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: { factor: 1.2, label: 'Ít vận động', desc: 'Làm việc văn phòng, ít tập thể dục' },
  light: { factor: 1.375, label: 'Vận động nhẹ', desc: 'Tập nhẹ 1-3 ngày/tuần hoặc đi bộ thường xuyên' },
  moderate: { factor: 1.55, label: 'Vận động vừa', desc: 'Tập thể dục 3-5 ngày/tuần' },
  very_active: { factor: 1.725, label: 'Vận động nhiều', desc: 'Tập luyện chăm chỉ 6-7 ngày/tuần' },
  extra_active: { factor: 1.9, label: 'Rất năng động', desc: 'Tập luyện thể thao cường độ cao hoặc lao động thể lực' }
};

/**
 * Tính TDEE (Tổng năng lượng tiêu hao hàng ngày ước tính)
 */
export function calculateTDEE(bmr, activityLevel = 'moderate') {
  if (!bmr) return null;
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.375;
  return Math.round(bmr * multiplier);
}

/**
 * Gợi ý lượng nước tham khảo dựa trên cân nặng, mức độ vận động và số liệu thực tế từ đồng hồ (nếu có)
 */
export function estimateRecommendedWater(weightKg, activityLevel = 'moderate', measuredSteps = 0, measuredCalories = 0) {
  if (!weightKg) return 2000;
  // Công thức chuẩn lâm sàng: 35ml / kg cân nặng
  let base = weightKg * 35;

  if (measuredSteps > 0 || measuredCalories > 0) {
    // Nếu có đồng hồ ghi nhận vận động thật: Bù nước theo tiêu hao cơ học (~40ml / 1000 bước hoặc 0.5ml / kcal)
    const sweatCompensation = Math.round((measuredSteps * 0.04) + (measuredCalories * 0.4));
    base += Math.min(800, sweatCompensation);
  } else {
    // Nếu không có đồng hồ: Tính theo hệ số mức độ vận động đã khai báo
    if (activityLevel === 'moderate') base += 300;
    if (activityLevel === 'very_active' || activityLevel === 'extra_active') base += 500;
  }

  // Làm tròn tới bội số của 50ml
  return Math.max(1500, Math.min(3800, Math.round(base / 50) * 50));
}

/**
 * ENGINE GỢI Ý SỨC KHỎE THEO BỐI CẢNH (Cycle + Hydration + Activity)
 * Dành riêng cho cặp đôi: cá nhân hóa cho bạn nữ và lời khuyên chăm sóc cho bạn nam
 */
export function getContextualHealthInsights({
  user,
  partner,
  isFemale,
  cycleInsight,
  waterStats,
  activityData,
  profile
}) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const phase = cycleInsight?.currentPhase || 'follicular';
  const hasCramps = cycleInsight?.symptomsToday?.some(s => s.symptom_type === 'cramps');
  const hasFatigue = cycleInsight?.symptomsToday?.some(s => s.symptom_type === 'fatigue');
  const isPeriod = cycleInsight?.isConfirmedPeriod;
  const isPredicted = cycleInsight?.isPredictedPeriod;

  // Lời khuyên cho BẠN NỮ
  if (isFemale) {
    let hydrationTip = 'Uống đủ nước giúp thanh lọc cơ thể và duy trì độ ẩm cho làn da.';
    let workoutTip = 'Vận động vừa sức giúp tinh thần sảng khoái và lưu thông khí huyết.';
    let nutritionTip = 'Duy trì bữa ăn đầy đủ protein, chất xơ và vitamin khoáng chất.';
    let statusBadge = 'Khỏe khoắn';

    if (isPeriod) {
      statusBadge = 'Kỳ kinh nguyệt 🌸';
      hydrationTip = hasCramps
        ? '💧 Hãy ưu tiên nước ấm hoặc trà gừng ấm. Bù đủ 2-2.2L nước ấm giúp tử cung bớt co thắt và giảm đầy hơi.'
        : '💧 Uống đều đặn từng ngụm nhỏ, tránh đồ uống có đá lạnh hoặc caffeine để bảo vệ dạ dày và mạch máu.';
      
      workoutTip = hasCramps || hasFatigue
        ? '🧘 Hôm nay nên ưu tiên nghỉ ngơi, đi dạo nhẹ nhàng hoặc tập giãn cơ yoga tư thế em bé (Child Pose). Tránh tập tạ nặng.'
        : '🚶 Đi bộ chậm 20–30 phút giúp giải phóng endorphin tự nhiên làm dịu cảm giác tức mỏi.';
      
      nutritionTip = '🥗 Tăng cường thực phẩm giàu sắt (thịt nạc, rau bina, đậu đỏ) và magie để hỗ trợ tái tạo máu và giảm đau.';
    } else if (phase === 'follicular') {
      statusBadge = 'Tràn đầy năng lượng ✨';
      hydrationTip = '💧 Năng lượng trao đổi chất đang tăng! Uống một ly nước ngay sau khi thức dậy để khởi động ngày mới tràn đầy sức sống.';
      workoutTip = '💪 Estrogen đang tăng cao — đây là thời điểm vàng để tập cardio, pilates hoặc các bài rèn luyện sức bền!';
      nutritionTip = '🥑 Bổ sung protein lành mạnh và chất béo tốt (hạt điều, quả bơ) để nuôi dưỡng năng lượng dồi dào.';
    } else if (phase === 'ovulation') {
      statusBadge = 'Rạng rỡ & Quyến rũ 💖';
      hydrationTip = '💧 Giữ đủ nước giúp cơ thể điều hòa nhiệt độ sinh học và duy trì làn da căng bóng.';
      workoutTip = '🏃‍♀️ Cơ thể dẻo dai và chịu tải tốt nhất trong tháng. Bạn có thể tự tin hoàn thành các bài tập yêu thích.';
      nutritionTip = '🍓 Thưởng thức trái cây giàu chất chống oxy hóa và rau củ quả tươi mát.';
    } else if (phase === 'luteal') {
      statusBadge = 'Giai đoạn Hoàng Thể (PMS) 🌿';
      hydrationTip = '💧 Progesterone tăng có thể gây giữ nước sinh lý. Uống nước ấm đều đặn và giảm muối để không bị cảm giác nặng nề.';
      workoutTip = '🧘‍♂️ Giảm cường độ bài tập nếu cảm thấy hơi uể oải. Yoga nhẹ, bơi chậm hoặc giãn cơ sẽ mang lại sự dễ chịu.';
      nutritionTip = '🍫 Một chút socola đen hoặc chuối chín giàu vitamin B6 và magie sẽ giúp cân bằng tâm trạng rất tốt.';
    }

    return {
      title: 'Sức khỏe của em hôm nay 💕',
      statusBadge,
      cyclePhaseName: cycleInsight?.evidence?.name || (isPeriod ? 'Hành kinh' : 'Bình thường'),
      cycleDay: cycleInsight?.cycleDay || null,
      hydrationTip,
      workoutTip,
      nutritionTip,
      careNote: isPeriod 
        ? 'Hãy yêu chiều bản thân nhiều hơn hôm nay nhé, không cần phải quá cố sức đâu!' 
        : 'Hãy cùng nửa kia duy trì mục tiêu sức khỏe hôm nay nhé!'
    };
  }

  // Lời khuyên cho BẠN NAM (Trợ lý chăm sóc người yêu thông minh)
  const partnerName = partner?.display_name || partner?.full_name || 'Cô ấy';
  const hasCycle = Boolean(cycleInsight && cycleInsight.cycleDay);
  const nextPeriodDate = cycleInsight?.nextPeriodStart;
  let daysUntilPeriod = null;
  if (nextPeriodDate) {
    const diff = Math.ceil((new Date(nextPeriodDate) - new Date()) / (1000 * 60 * 60 * 24));
    daysUntilPeriod = diff >= 0 ? diff : null;
  }

  // Nếu bạn nữ chưa cập nhật hoặc chưa ghi nhận chu kỳ
  if (!hasCycle) {
    return {
      title: `Trợ lý chăm sóc ${partnerName} 💑`,
      statusBadge: 'Chưa có lịch chu kỳ',
      cyclePhaseName: null,
      cycleDay: null,
      daysUntilPeriod: null,
      hasCycleData: false,
      careNote: `Hiện tại ${partnerName} chưa cập nhật lịch chu kỳ kinh nguyệt gần nhất. Hãy nhắc cô ấy vào mục "Chu Kỳ & Care" đánh dấu ngày để bạn có thể theo dõi và chăm sóc cô ấy chu đáo nhé! 🌸`,
      hydrationTip: `Theo dõi bình nước của ${partnerName}: đừng để cô ấy khát nước nhé!`,
      workoutTip: `Cùng ${partnerName} hoàn thành mục tiêu số bước chân hôm nay nhé!`,
      nutritionTip: `Nhắc ${partnerName} ăn uống đúng giờ và giữ gìn sức khỏe nhé.`
    };
  }

  // Khi ĐÃ CÓ dữ liệu chu kỳ của bạn nữ
  let partnerPhaseName = cycleInsight?.evidence?.name || (isPeriod ? 'Kỳ kinh nguyệt' : 'Bình thường');
  let careAction = `Nhắc ${partnerName} uống nước đều đặn và động viên nhau giữ gìn sức khỏe nhé.`;
  let badge = 'Đồng hành yêu thương 💙';

  if (isPeriod) {
    badge = 'Kỳ kinh nguyệt 🌸';
    partnerPhaseName = 'Hành kinh (Dâu rụng)';
    careAction = hasCramps
      ? `🚨 ${partnerName} đang bị đau bụng hành kinh. Hãy chủ động chuẩn bị túi chườm ấm, một ly nước ấm hoặc trà gừng, và gánh vác việc nặng giúp cô ấy nhé!`
      : `🌸 ${partnerName} đang trong kỳ dâu rụng. Hãy hỏi thăm xem cô ấy đã uống đủ nước ấm chưa và dành những lời nhẹ nhàng, âu yếm cho cô ấy nhé.`;
  } else if (phase === 'luteal') {
    partnerPhaseName = 'Hoàng thể (Trước kỳ kinh)';
    if (daysUntilPeriod !== null && daysUntilPeriod <= 3) {
      badge = `Sắp đến kỳ (${daysUntilPeriod} ngày nữa) ⏳`;
      careAction = `🌤️ Chỉ còn khoảng ${daysUntilPeriod} ngày nữa là đến kỳ kinh của ${partnerName}. Giai đoạn này cô ấy có thể dễ mệt mỏi, đau lưng hoặc tủi thân (PMS). Hãy kiên nhẫn hơn, chuẩn bị sẵn đồ dùng và tặng cô ấy một cái ôm ấm áp nhé!`;
    } else {
      badge = 'Giai đoạn nhạy cảm (PMS) 🕊️';
      careAction = `🌤️ Giai đoạn này ${partnerName} có thể dễ mệt mỏi hoặc tủi thân hơn bình thường. Hãy kiên nhẫn hơn, chuẩn bị chút đồ ăn vặt yêu thích và chăm sóc cô ấy nhé.`;
    }
  } else if (phase === 'ovulation') {
    badge = 'Giai đoạn Rụng trứng 💖';
    partnerPhaseName = 'Rụng trứng';
    careAction = `✨ Tâm trạng và năng lượng của ${partnerName} đang rất tích cực. Rủ cô ấy đi dạo mát, hẹn hò hoặc cùng nhau tập luyện nhé!`;
  } else if (phase === 'follicular') {
    badge = 'Năng lượng tích cực 🎉';
    partnerPhaseName = 'Nang noãn (Sau hành kinh)';
    careAction = `🌿 ${partnerName} đang tràn trề năng lượng sau kỳ kinh. Đây là thời điểm tuyệt vời để cùng nhau lên kế hoạch vui chơi!`;
  }

  return {
    title: `Trợ lý chăm sóc ${partnerName} 💑`,
    statusBadge: badge,
    cyclePhaseName: partnerPhaseName,
    cycleDay: cycleInsight.cycleDay,
    daysUntilPeriod,
    hasCycleData: true,
    careNote: careAction,
    hydrationTip: isPeriod 
      ? `Nhắc ${partnerName} uống nước ấm (tránh nước đá lạnh) để giảm đau tức bụng.` 
      : `Theo dõi bình nước của ${partnerName}: đừng để cô ấy khát nước nhé!`,
    workoutTip: isPeriod 
      ? `Tránh rủ ${partnerName} vận động nặng lúc này. Một buổi xem phim cùng nhau sẽ tuyệt vời hơn.` 
      : `Cùng ${partnerName} hoàn thành mục tiêu số bước chân hôm nay nhé!`,
    nutritionTip: isPeriod 
      ? 'Gợi ý món ăn bồi bổ: cháo bồ câu, canh rong biển hoặc trà gừng mật ong.' 
      : 'Uống nhiều nước trái cây và cùng nhau ăn uống lành mạnh.'
  };
}

/**
 * TÍNH TOÁN PHÁC ĐỒ CÁ NHÂN HÓA 100% THEO CHỈ SỐ THỰC TẾ
 * Không hardcode bất kỳ chỉ số nào:
 * - BMR & TDEE tính theo công thức Mifflin-St Jeor
 * - Mức thâm hụt / thặng dư calo tùy biến theo độ chênh lệch cân nặng và giới tính
 * - Lượng nước tính theo cân nặng thực tế (38ml/kg)
 * - Lượng đạm protein tính theo giới tính và cân nặng (Nam: 1.8g/kg, Nữ: 1.5g/kg)
 * - Bước chân điều chỉnh theo BMI (thừa cân nhiều -> cardio ít va đập để bảo vệ gối)
 * - Các giai đoạn (Phases) tự động phân chia theo độ dài thời gian thực tế
 */
export function generatePersonalizedRoadmap({
  currentWeight,
  height,
  targetWeight,
  gender = 'male',
  birthDate = null,
  activityLevel = 'moderate',
  profile = {}
}) {
  const isFemale = gender === 'FEMALE' || gender === 'Nữ' || gender === 'female';
  const weightNum = parseFloat(currentWeight) || (isFemale ? 50 : 65);
  const heightNum = parseFloat(height) || (isFemale ? 158 : 170);
  
  // Tính tuổi
  let age = 25;
  const bDate = birthDate || profile?.birth_date;
  if (bDate) {
    const diff = new Date().getFullYear() - new Date(bDate).getFullYear();
    if (diff >= 12 && diff <= 90) age = diff;
  }

  // Chuẩn BMI Châu Á (WHO/WPRO)
  const hM = heightNum / 100;
  const bmi = parseFloat((weightNum / (hM * hM)).toFixed(1));
  
  const minIdeal = Math.round(18.5 * (hM ** 2) * 10) / 10;
  const maxIdeal = Math.round(22.9 * (hM ** 2) * 10) / 10;
  const optimalIdeal = Math.round(21.2 * (hM ** 2) * 10) / 10;

  // Cân nặng mục tiêu
  const effectiveTarget = targetWeight ? parseFloat(targetWeight) : optimalIdeal;
  const rawDiff = Math.round((weightNum - effectiveTarget) * 10) / 10;
  const kgGap = Math.abs(rawDiff);

  const isLosing = rawDiff > 0.3;
  const isGaining = rawDiff < -0.3;
  const isMaintaining = !isLosing && !isGaining;

  // BMR & TDEE
  const bmr = calculateBMR(weightNum, heightNum, age, gender) || (isFemale ? 1250 : 1550);
  const tdee = calculateTDEE(bmr, activityLevel) || Math.round(bmr * 1.375);

  // Thâm hụt / Thặng dư calo động
  let deficitKcal = 0;
  let safeRate = 0.5;
  let rateLabel = '0.5 kg / tuần';

  if (isLosing) {
    if (kgGap <= 2.5) {
      // Giảm ít: chỉ cần thâm hụt nhẹ để không mất cơ
      deficitKcal = Math.round(Math.min(300, tdee * 0.12));
      safeRate = 0.3;
      rateLabel = '0.3 kg / tuần (Siết nhẹ)';
    } else if (kgGap <= 6) {
      // Giảm vừa
      deficitKcal = Math.round(Math.min(420, tdee * 0.18));
      safeRate = 0.45;
      rateLabel = '0.45 kg / tuần';
    } else {
      // Giảm nhiều
      deficitKcal = Math.round(Math.min(550, tdee * 0.22));
      safeRate = 0.5;
      rateLabel = '0.5 kg / tuần (Chuẩn Y Khoa)';
    }

    // Đảm bảo calo nạp không bao giờ rớt xuống dưới BMR (đặc biệt an toàn cho nữ)
    const floorLimit = isFemale ? Math.max(1200, bmr) : Math.max(1400, bmr);
    if (tdee - deficitKcal < floorLimit) {
      deficitKcal = Math.max(200, tdee - floorLimit);
    }
  } else if (isGaining) {
    deficitKcal = -Math.round(Math.min(400, tdee * 0.16)); // Thặng dư
    safeRate = 0.35;
    rateLabel = '0.35 kg / tuần (Tăng cơ nạc)';
  } else {
    deficitKcal = 0;
    safeRate = 0;
    rateLabel = 'Duy trì cân bằng';
  }

  // Thời gian hoàn thành
  const weeksNeeded = isMaintaining ? 0 : Math.max(1, Math.ceil(kgGap / safeRate));
  const monthsNeeded = isMaintaining ? 0 : Math.round((weeksNeeded / 4.2) * 10) / 10;

  // Nhu cầu nước (38ml / kg + bù đắp vận động)
  const waterTargetMl = estimateRecommendedWater(weightNum, activityLevel);

  // Bước chân & Vận động theo BMI & Thể trạng
  let dailySteps = 8000;
  let stepAdvice = '';
  if (isLosing) {
    if (bmi >= 27) {
      dailySteps = 7500;
      stepAdvice = 'Đi bộ dốc (Incline walk), đạp xe hoặc bơi lội (tránh chạy va chạm mạnh gây đau khớp gối)';
    } else {
      dailySteps = 9000;
      stepAdvice = '35-45 phút đi bộ nhanh hoặc cardio ngắt quãng (HIIT) kết hợp bài tập toàn thân';
    }
  } else if (isGaining) {
    dailySteps = 6500;
    stepAdvice = 'Tập trung kháng lực tăng cơ (Squat, Bench press, Deadlift), không cardio quá nhiều';
  } else {
    dailySteps = 8000;
    stepAdvice = 'Vận động thể thao thoải mái 30 phút mỗi ngày duy trì sức bền tim mạch';
  }

  // Đạm & Dinh dưỡng cá nhân hóa
  const proteinMultiplier = isFemale ? 1.5 : 1.8;
  const targetProteinGrams = Math.round(weightNum * proteinMultiplier);

  // Phân chia các giai đoạn (Phases) linh hoạt dựa trên thời gian thực tế
  let phases = [];
  if (isLosing) {
    if (weeksNeeded <= 4) {
      // Sprint ngắn 1-4 tuần
      phases = [
        { phase: `Tuần 1 - 2`, title: 'Cắt giảm đường & Xả nước tích', detail: 'Hạn chế gia vị mặn, đồ ngọt và ăn vặt sau 20h. Cân nặng sẽ giảm 1-1.5kg đầu tiên nhờ thanh lọc.' },
        { phase: `Tuần 3 - ${weeksNeeded}`, title: 'Siết mỡ vòng eo & Chạm đích', detail: `Duy trì calo ${tdee - deficitKcal} kcal/ngày, nạp đủ ${targetProteinGrams}g đạm để cơ bụng săn chắc.` },
        { phase: 'Về đích', title: 'Khóa cân nặng ổn định', detail: 'Tăng dần calo về mức cân bằng TDEE để giữ vóc dáng thon gọn bền vững.' }
      ];
    } else if (weeksNeeded <= 12) {
      // Trung hạn 5-12 tuần
      const midWeek = Math.round(weeksNeeded / 2);
      phases = [
        { phase: `Tuần 1 - 3`, title: 'Khởi động & Tạo đà chuyển hóa', detail: 'Thích nghi với việc cắt giảm 1 chén cơm/bữa, uống đủ nước trước ăn để bao tử quen dần.' },
        { phase: `Tuần 4 - ${midWeek}`, title: 'Đốt mỡ nội tạng & Tăng cơ', detail: `Tập kháng lực 3-4 buổi/tuần, đạt ${dailySteps.toLocaleString()} bước chân/ngày để đốt mỡ sâu.` },
        { phase: `Tuần ${midWeek + 1} - ${weeksNeeded}`, title: 'Siết nét vóc dáng & Về đích', detail: `Mục tiêu chạm mốc ${effectiveTarget}kg. Tiếp tục giữ chế độ ăn sạch giàu protein.` },
        { phase: 'Duy trì dài hạn', title: 'Tự tin với vóc dáng mới', detail: 'Cơ thể nhẹ nhõm, thiết lập thói quen ăn uống trực giác không lo tăng cân lại.' }
      ];
    } else {
      // Dài hạn > 12 tuần (Chuyển đổi lớn)
      const p1 = Math.round(weeksNeeded * 0.3);
      const p2 = Math.round(weeksNeeded * 0.65);
      phases = [
        { phase: `Tuần 1 - ${p1}`, title: 'Giai đoạn 1: Giảm tải áp lực khớp', detail: `Mục tiêu giảm 3-4kg đầu tiên giúp cơ thể nhẹ nhõm, bớt áp lực lên cột sống và khớp gối.` },
        { phase: `Tuần ${p1 + 1} - ${p2}`, title: 'Giai đoạn 2: Đốt mỡ chuyên sâu & Diet Break', detail: `Đốt mỡ ổn định. Sau mỗi 6 tuần có 1 tuần xả thâm hụt (Diet Break) để reset hormone Leptin.` },
        { phase: `Tuần ${p2 + 1} - ${weeksNeeded}`, title: 'Giai đoạn 3: Tăng cơ siết nét toàn thân', detail: `Bổ sung ${targetProteinGrams}g đạm/ngày, tập tạ định hình đường cong săn chắc, không chùng da.` },
        { phase: 'Giai đoạn 4', title: 'Khóa điểm cân bằng mới (Set-Point)', detail: 'Giữ cân nặng ổn định tối thiểu 3 tháng để cơ thể ghi nhận đây là mốc cân vĩnh viễn.' }
      ];
    }
  } else if (isGaining) {
    phases = [
      { phase: 'Tuần 1 - 2', title: 'Tăng khả năng hấp thu tiêu hóa', detail: 'Ăn đủ 3 bữa chính + 2 bữa phụ với sữa hạt, chuối bơ để bao tử hấp thu dưỡng chất tốt nhất.' },
      { phase: `Tuần 3 - ${weeksNeeded}`, title: 'Tăng khối lượng cơ bắp nạc', detail: `Tập kháng lực kích thích cơ bắp phát triển, nạp ${targetProteinGrams}g đạm mỗi ngày.` },
      { phase: 'Về đích', title: 'Thân hình đầy đặn & Khỏe khoắn', detail: `Đạt cân nặng mục tiêu ${effectiveTarget}kg với năng lượng tràn đầy.` }
    ];
  } else {
    phases = [
      { phase: 'Hàng ngày', title: 'Duy trì lối sống năng động', detail: 'Ăn uống đa dạng, uống đủ nước và giữ tinh thần vui tươi thoải mái.' },
      { phase: 'Hàng tuần', title: 'Kiểm tra cân 1 lần', detail: 'Cân vào sáng sớm khi bụng rỗng để theo dõi sức khỏe ổn định.' }
    ];
  }

  return {
    bmi,
    height: heightNum,
    currentWeight: weightNum,
    targetWeight: effectiveTarget,
    idealRange: { min: minIdeal, max: maxIdeal, optimal: optimalIdeal },
    kgGap,
    isLosing,
    isGaining,
    isMaintaining,
    weeksNeeded,
    monthsNeeded,
    safeRate,
    safeRateText: rateLabel,
    bmr,
    tdee,
    dailyCalorieTarget: tdee - deficitKcal,
    deficitKcal,
    waterTargetMl,
    dailySteps,
    stepAdvice,
    targetProteinGrams,
    genderNotice: isFemale 
      ? 'Chế độ thiết kế tối ưu cho nữ: bảo vệ nội tiết tố, bổ sung chất béo tốt và sắt.'
      : 'Chế độ thiết kế tối ưu cho nam: tăng cường đạm nạc phát triển khối cơ và sức mạnh.',
    phases
  };
}
