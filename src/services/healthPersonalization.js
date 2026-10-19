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
