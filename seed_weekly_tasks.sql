-- Lệnh SQL Seed Dữ liệu Thời Khóa Biểu cho cặp đôi của breezeboy777
-- Chạy đoạn lệnh này trong SQL Editor của Supabase

DO $$
DECLARE
  v_couple_id UUID;
BEGIN
  -- Lấy couple_id của user breezeboy777
  SELECT couple_id INTO v_couple_id
  FROM users
  WHERE username = 'breezeboy777'
  LIMIT 1;

  IF v_couple_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy user breezeboy777 hoặc user chưa có couple_id';
  END IF;

  -- Xóa dữ liệu cũ của couple này (nếu muốn reset)
  DELETE FROM tasks WHERE couple_id = v_couple_id;

  -- BẮT ĐẦU INSERT LỊCH TRÌNH
  INSERT INTO tasks (id, couple_id, title, time, day, person, category, is_completed, sort_order)
  VALUES 
    -- ============== THỨ HAI (day = 0) ==============
    (gen_random_uuid(), v_couple_id, 'Dậy hâm cơm, 7:20 đi làm (mang CF ủ)', '06:30', 0, 'MALE', 'HOUSE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Dậy chuẩn bị, 7:40 đi làm', '07:00', 0, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 0, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 0, 'FEMALE', 'WORK', false, 4),
    (gen_random_uuid(), v_couple_id, 'Ăn cơm hộp tự chuẩn bị', '11:30', 0, 'BOTH', 'SELF_CARE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi trưa tại công ty', '12:00', 0, 'BOTH', 'SELF_CARE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 0, 'MALE', 'WORK', false, 7),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 0, 'FEMALE', 'WORK', false, 8),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, chạy xe về', '17:00', 0, 'MALE', 'WORK', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, về 17:15 sơ chế đồ ăn', '17:00', 0, 'FEMALE', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Phong về, cùng Thi nấu bữa tối', '17:40', 0, 'MALE', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Nấu xong thức ăn tối & đồ trưa mai', '18:30', 0, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Đi bơi cùng nhau', '19:30', 0, 'BOTH', 'SPORT', false, 13),
    (gen_random_uuid(), v_couple_id, 'Ăn tối đã nấu, Phong rửa chén', '21:00', 0, 'MALE', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Pha CF ủ lạnh sáng mai mang đi', '21:30', 0, 'MALE', 'HOUSE', false, 15),
    (gen_random_uuid(), v_couple_id, 'Ngâm chân nước ấm, skincare', '22:30', 0, 'BOTH', 'SELF_CARE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Ngủ ngon lấy sức', '23:00', 0, 'BOTH', 'SELF_CARE', false, 17),

    -- ============== THỨ BA (day = 1) ==============
    (gen_random_uuid(), v_couple_id, 'Dậy hâm cơm, 7:20 đi làm (mang CF ủ)', '06:30', 1, 'MALE', 'HOUSE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Dậy chuẩn bị, 7:40 đi làm', '07:00', 1, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 1, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 1, 'FEMALE', 'WORK', false, 4),
    (gen_random_uuid(), v_couple_id, 'Ăn cơm hộp tự chuẩn bị', '11:30', 1, 'BOTH', 'SELF_CARE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi trưa tại công ty', '12:00', 1, 'BOTH', 'SELF_CARE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 1, 'MALE', 'WORK', false, 7),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 1, 'FEMALE', 'WORK', false, 8),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, chạy xe về', '17:00', 1, 'MALE', 'WORK', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, về 17:15 sơ chế đồ ăn', '17:00', 1, 'FEMALE', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Phong về, cùng Thi nấu bữa tối', '17:40', 1, 'MALE', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Ăn tối & chuẩn bị đồ trưa', '18:30', 1, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Phong rửa chén; Thi quét lau nhà', '19:30', 1, 'MALE', 'HOUSE', false, 13),
    (gen_random_uuid(), v_couple_id, 'Pha CF ủ lạnh sáng mai', '20:15', 1, 'MALE', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Thư giãn, xem phim / nghe nhạc 🎬', '20:30', 1, 'BOTH', 'DATE', false, 15),
    (gen_random_uuid(), v_couple_id, 'Tâm sự trước khi ngủ', '22:30', 1, 'BOTH', 'DATE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Ngủ sớm và trọn giấc', '23:00', 1, 'BOTH', 'SELF_CARE', false, 17),

    -- ============== THỨ TƯ (day = 2) ==============
    (gen_random_uuid(), v_couple_id, 'Dậy hâm cơm, 7:20 đi làm (mang CF ủ)', '06:30', 2, 'MALE', 'HOUSE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Dậy chuẩn bị, 7:40 đi làm', '07:00', 2, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 2, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 2, 'FEMALE', 'WORK', false, 4),
    (gen_random_uuid(), v_couple_id, 'Ăn cơm hộp tự chuẩn bị', '11:30', 2, 'BOTH', 'SELF_CARE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi trưa tại công ty', '12:00', 2, 'BOTH', 'SELF_CARE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 2, 'MALE', 'WORK', false, 7),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 2, 'FEMALE', 'WORK', false, 8),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, chạy xe về', '17:00', 2, 'MALE', 'WORK', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, về 17:15 sơ chế đồ ăn', '17:00', 2, 'FEMALE', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Phong về, cùng Thi nấu bữa tối', '17:40', 2, 'MALE', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Ăn tối & chuẩn bị đồ trưa', '18:30', 2, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Đi bộ / chạy / đạp xe 🏃‍♂️', '19:30', 2, 'BOTH', 'SPORT', false, 13),
    (gen_random_uuid(), v_couple_id, 'Ăn tối, Phong rửa chén', '20:45', 2, 'MALE', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Pha CF ủ lạnh sáng mai mang đi', '21:15', 2, 'MALE', 'HOUSE', false, 15),
    (gen_random_uuid(), v_couple_id, 'Đọc sách nhẹ nhàng, nghe nhạc', '22:30', 2, 'BOTH', 'SELF_CARE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Đi ngủ ngon', '23:00', 2, 'BOTH', 'SELF_CARE', false, 17),

    -- ============== THỨ NĂM (day = 3) ==============
    (gen_random_uuid(), v_couple_id, 'Dậy hâm cơm, 7:20 đi làm (mang CF ủ)', '06:30', 3, 'MALE', 'HOUSE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Dậy chuẩn bị, 7:40 đi làm', '07:00', 3, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 3, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 3, 'FEMALE', 'WORK', false, 4),
    (gen_random_uuid(), v_couple_id, 'Ăn cơm hộp tự chuẩn bị', '11:30', 3, 'BOTH', 'SELF_CARE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi trưa tại công ty', '12:00', 3, 'BOTH', 'SELF_CARE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 3, 'MALE', 'WORK', false, 7),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 3, 'FEMALE', 'WORK', false, 8),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, chạy xe về', '17:00', 3, 'MALE', 'WORK', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, về 17:15 sơ chế đồ ăn', '17:00', 3, 'FEMALE', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Phong về, cùng nấu bữa tối', '17:40', 3, 'MALE', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Ăn tối & chuẩn bị đồ trưa', '18:30', 3, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Phong rửa chén & quét lau nhà', '19:30', 3, 'MALE', 'HOUSE', false, 13),
    (gen_random_uuid(), v_couple_id, 'Pha CF ủ lạnh sáng mai', '20:15', 3, 'MALE', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Đọc sách, uống trà thư giãn', '20:30', 3, 'BOTH', 'DATE', false, 15),
    (gen_random_uuid(), v_couple_id, 'Tâm sự trước khi ngủ', '22:30', 3, 'BOTH', 'DATE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Ngủ ngon', '23:00', 3, 'BOTH', 'SELF_CARE', false, 17),

    -- ============== THỨ SÁU (day = 4) ==============
    (gen_random_uuid(), v_couple_id, 'Dậy hâm cơm, 7:20 đi làm', '06:30', 4, 'MALE', 'HOUSE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Dậy chuẩn bị, 7:40 đi làm', '07:00', 4, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 4, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Làm việc tại công ty', '08:00', 4, 'FEMALE', 'WORK', false, 4),
    (gen_random_uuid(), v_couple_id, '12:40 tan làm về nhà', '12:40', 4, 'MALE', 'WORK', false, 5),
    (gen_random_uuid(), v_couple_id, 'Cùng ăn trưa & nghỉ ngơi', '13:00', 4, 'BOTH', 'DATE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 4, 'MALE', 'WORK', false, 7),
    (gen_random_uuid(), v_couple_id, 'Làm việc tập trung tại cty', '13:30', 4, 'FEMALE', 'WORK', false, 8),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, chạy xe về', '17:00', 4, 'MALE', 'WORK', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tan làm 17:00, về 17:15 sơ chế đồ ăn', '17:00', 4, 'FEMALE', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Phong về, cùng Thi nấu bữa tối', '17:40', 4, 'MALE', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Nấu xong thức ăn tối & đồ trưa T7', '18:30', 4, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Đi bơi xả stress cuối tuần 🌊', '19:30', 4, 'BOTH', 'SPORT', false, 13),
    (gen_random_uuid(), v_couple_id, 'Ăn tối, Phong rửa chén', '21:00', 4, 'MALE', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Cả hai thư giãn, đón weekend', '21:30', 4, 'BOTH', 'DATE', false, 15),
    (gen_random_uuid(), v_couple_id, 'Thư giãn cuối tuần thoải mái', '22:30', 4, 'BOTH', 'SELF_CARE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Thức khuya một chút xem phim', '23:00', 4, 'BOTH', 'DATE', false, 17),

    -- ============== THỨ BẢY (day = 5) ==============
    (gen_random_uuid(), v_couple_id, '6:30 hâm cơm, 7:20 đi làm cty', '06:30', 5, 'MALE', 'WORK', false, 1),
    (gen_random_uuid(), v_couple_id, 'Thong thả dậy muộn, ăn sáng', '07:00', 5, 'FEMALE', 'SELF_CARE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Làm việc cty (đến 12:00)', '08:00', 5, 'MALE', 'WORK', false, 3),
    (gen_random_uuid(), v_couple_id, 'Dọn dẹp phòng & nghỉ ngơi', '09:00', 5, 'FEMALE', 'HOUSE', false, 4),
    (gen_random_uuid(), v_couple_id, 'Cùng nấu bữa trưa tươi ngon', '12:00', 5, 'BOTH', 'HOUSE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Thưởng thức & nghỉ ngơi trưa', '13:00', 5, 'BOTH', 'DATE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi thư giãn đôi', '13:30', 5, 'BOTH', 'DATE', false, 7),
    (gen_random_uuid(), v_couple_id, 'Đi lễ nhà thờ ⛪', '15:00', 5, 'BOTH', 'SELF_CARE', false, 8),
    (gen_random_uuid(), v_couple_id, 'Thể thao hoàng hôn đôi 🏃‍♂️', '16:30', 5, 'BOTH', 'SPORT', false, 9),
    (gen_random_uuid(), v_couple_id, 'Tắm rửa sau thể thao', '18:00', 5, 'BOTH', 'SELF_CARE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Cùng nấu bữa tối đặc biệt cuối tuần', '18:30', 5, 'BOTH', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Hẹn hò cuối tuần ❤️ Xem phim / dạo phố đêm', '19:30', 5, 'BOTH', 'DATE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Về nhà: Phong rửa chén gọn gàng', '22:00', 5, 'MALE', 'HOUSE', false, 13),
    (gen_random_uuid(), v_couple_id, 'Nghỉ ngơi thư giãn trọn vẹn', '22:30', 5, 'BOTH', 'SELF_CARE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Không đặt báo thức sáng mai', '23:00', 5, 'BOTH', 'SELF_CARE', false, 15),

    -- ============== CHỦ NHẬT (day = 6) ==============
    (gen_random_uuid(), v_couple_id, 'Ngủ nướng thư giãn', '07:00', 6, 'BOTH', 'SELF_CARE', false, 1),
    (gen_random_uuid(), v_couple_id, 'Cùng làm bữa sáng đôi ấm cúng', '08:00', 6, 'BOTH', 'HOUSE', false, 2),
    (gen_random_uuid(), v_couple_id, 'Dọn phòng, chăm cây ban công', '09:00', 6, 'MALE', 'HOUSE', false, 3),
    (gen_random_uuid(), v_couple_id, 'Giặt giũ, sắp xếp nhà cửa', '09:00', 6, 'FEMALE', 'HOUSE', false, 4),
    (gen_random_uuid(), v_couple_id, 'Cùng nấu bữa trưa tươi ngon', '11:30', 6, 'BOTH', 'HOUSE', false, 5),
    (gen_random_uuid(), v_couple_id, 'Thưởng thức & nghỉ ngơi trưa', '12:30', 6, 'BOTH', 'DATE', false, 6),
    (gen_random_uuid(), v_couple_id, 'Đi cafe tâm sự cuối tuần', '14:00', 6, 'BOTH', 'DATE', false, 7),
    (gen_random_uuid(), v_couple_id, 'Chụp ảnh kỷ niệm & đọc sách', '15:00', 6, 'BOTH', 'DATE', false, 8),
    (gen_random_uuid(), v_couple_id, 'Đi siêu thị sắm thực phẩm 🛒', '16:00', 6, 'BOTH', 'HOUSE', false, 9),
    (gen_random_uuid(), v_couple_id, 'Mua đồ tươi ngon cho cả tuần mới', '17:00', 6, 'BOTH', 'HOUSE', false, 10),
    (gen_random_uuid(), v_couple_id, 'Sắp xếp đồ tủ lạnh, sơ chế', '18:00', 6, 'BOTH', 'HOUSE', false, 11),
    (gen_random_uuid(), v_couple_id, 'Nấu bữa tối ấm áp, nhẹ nhàng', '18:30', 6, 'BOTH', 'HOUSE', false, 12),
    (gen_random_uuid(), v_couple_id, 'Cả hai ăn tối, Phong rửa chén', '19:30', 6, 'BOTH', 'HOUSE', false, 13),
    (gen_random_uuid(), v_couple_id, 'Quét & lau nhà tổng thể cuối tuần', '20:00', 6, 'BOTH', 'HOUSE', false, 14),
    (gen_random_uuid(), v_couple_id, 'Review chi tiêu & lên kế hoạch tuần mới', '21:00', 6, 'BOTH', 'WORK', false, 15),
    (gen_random_uuid(), v_couple_id, 'Skincare, ngủ sớm', '22:30', 6, 'BOTH', 'SELF_CARE', false, 16),
    (gen_random_uuid(), v_couple_id, 'Nạp năng lượng cho sáng Thứ Hai', '23:00', 6, 'BOTH', 'SELF_CARE', false, 17);

END $$;
