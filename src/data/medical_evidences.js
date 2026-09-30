export const MEDICAL_EVIDENCES = {
  phases: {
    menstruation: {
      id: 'menstruation',
      name: 'Hành kinh',
      female_insight: 'Bạn đang trong những ngày hành kinh. Hormone Estrogen và Progesterone ở mức thấp nhất có thể khiến bạn cảm thấy uể oải.',
      male_insight: 'Cô ấy đang trong những ngày "dâu rụng". Cơ thể cô ấy có thể đang khá mệt mỏi do sụt giảm hormone.',
      couple_care_tips: [
        'Một túi chườm ấm hoặc một cốc trà gừng ấm sẽ là món quà tuyệt vời lúc này.',
        'Hạn chế các hoạt động thể lực mạnh nếu cô ấy cảm thấy mỏi lưng hoặc đau bụng.',
        'Hãy nhẹ nhàng và chủ động làm giúp cô ấy một vài việc nhà nhé!'
      ],
      recommendations: [
        {
          id: 'hydration',
          title: 'Tăng cường bù nước',
          content: 'Việc uống đủ 2-2.5 lít nước/ngày trong kỳ kinh giúp giảm thiểu tình trạng đầy hơi (water retention) và co thắt.',
          source_name: 'ACOG (American College of Obstetricians and Gynecologists)'
        },
        {
          id: 'iron',
          title: 'Bổ sung Sắt',
          content: 'Cơ thể mất máu sẽ kéo theo mất lượng nhỏ sắt, hãy ưu tiên các thực phẩm như thịt đỏ, rau bó xôi, hoặc các loại đậu.',
          source_name: 'Office on Women\'s Health'
        }
      ]
    },
    follicular: {
      id: 'follicular',
      name: 'Nang noãn (Sau hành kinh)',
      female_insight: 'Estrogen đang tăng dần! Đây là lúc năng lượng, tâm trạng và khả năng tập trung của bạn ở mức tốt nhất trong tháng.',
      male_insight: 'Tâm trạng và năng lượng của cô ấy đang rất tốt. Đây là thời điểm lý tưởng cho các buổi hẹn hò năng động.',
      couple_care_tips: [
        'Rủ cô ấy tham gia một hoạt động ngoài trời, dã ngoại hoặc thể thao.',
        'Đây là lúc cô ấy rạng rỡ và tự tin nhất, hãy dành cho cô ấy những lời khen nhé!'
      ],
      recommendations: [
        {
          id: 'exercise_peak',
          title: 'Tối ưu hóa tập luyện',
          content: 'Nghiên cứu cho thấy giai đoạn này cơ thể có sức bền và khả năng chịu tải tốt nhất nhờ mức Estrogen tăng cao. Bạn có thể tăng cường độ tập luyện.',
          source_name: 'PubMed: Menstrual Cycle Phase and Exercise Performance'
        }
      ]
    },
    ovulation: {
      id: 'ovulation',
      name: 'Rụng trứng',
      female_insight: 'Estrogen đạt đỉnh điểm. Bạn có thể cảm thấy vô cùng quyến rũ và tràn đầy năng lượng, nhưng cũng có thể gặp chút đau tức nhẹ ở bụng dưới.',
      male_insight: 'Cô ấy đang ở giai đoạn rụng trứng. Năng lượng cao nhưng có thể xuất hiện những cơn đau nhói nhẹ ở bụng.',
      couple_care_tips: [
        'Một buổi tối lãng mạn sẽ rất phù hợp trong những ngày này.'
      ],
      recommendations: [
        {
          id: 'mittelschmerz',
          title: 'Đau bụng rụng trứng (Mittelschmerz)',
          content: 'Khoảng 20% phụ nữ gặp hiện tượng đau nhói một bên bụng dưới khi trứng rụng. Đây là hiện tượng sinh lý hoàn toàn bình thường.',
          source_name: 'Mayo Clinic'
        }
      ]
    },
    luteal: {
      id: 'luteal',
      name: 'Hoàng thể (Trước kỳ kinh)',
      female_insight: 'Progesterone tăng cao có thể làm bạn thấy buồn ngủ, thèm ăn hoặc nhạy cảm hơn (Hội chứng PMS). Hãy dịu dàng với bản thân nhé!',
      male_insight: 'Cảnh báo PMS! Sự thay đổi hormone có thể khiến cô ấy mệt mỏi, nhạy cảm hoặc dễ cáu gắt hơn bình thường.',
      couple_care_tips: [
        '⚠️ Hôm nay ưu tiên sự nhẹ nhàng. Nếu cô ấy hơi khó chịu, đừng vội tranh luận.',
        'Chuẩn bị sẵn món ăn vặt cô ấy thích (socola đen rất tốt cho tâm trạng lúc này).',
        'Lắng nghe và kiên nhẫn hơn, đôi khi cô ấy chỉ cần một cái ôm.'
      ],
      recommendations: [
        {
          id: 'pms_diet',
          title: 'Kiểm soát đường huyết',
          content: 'Chia nhỏ bữa ăn và giảm lượng đường tinh luyện, muối có thể giúp giảm đáng kể các triệu chứng bồn chồn và đầy hơi của PMS.',
          source_name: 'NHS (National Health Service)'
        },
        {
          id: 'magnesium',
          title: 'Thực phẩm giàu Magie',
          content: 'Ăn các thực phẩm như hạt bí, socola đen, chuối giúp bổ sung Magie, được khoa học chứng minh giúp thư giãn cơ và cải thiện tâm trạng.',
          source_name: 'Cleveland Clinic'
        }
      ]
    }
  },
  symptoms: {
    cramps: {
      id: 'cramps',
      name: 'Đau bụng',
      recommendations: [
        {
          id: 'heat_therapy',
          title: 'Liệu pháp chườm nhiệt',
          content: 'Chườm ấm (khoảng 40°C) vùng bụng dưới giúp làm giãn cơ tử cung, giảm co thắt cơ học hiệu quả tương đương thuốc giảm đau nhẹ.',
          source_name: 'ACOG / Cochrane Database'
        }
      ]
    },
    mood: {
      id: 'mood',
      name: 'Tâm trạng thất thường',
      recommendations: [
        {
          id: 'light_exercise',
          title: 'Vận động nhẹ nhàng',
          content: 'Yoga hoặc đi bộ nhẹ giúp cơ thể giải phóng Endorphin - chất giảm đau và cải thiện tâm trạng tự nhiên.',
          source_name: 'WHO'
        }
      ]
    }
  }
};
