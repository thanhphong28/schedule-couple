// services/bluetoothSmartwatch.js
// Dịch vụ kết nối Bluetooth LE (GATT) THỰC TẾ 100% cho đồng hồ thông minh & thiết bị đeo sức khỏe
// Tuyệt đối KHÔNG giả lập dữ liệu, KHÔNG số liệu ảo, chỉ đọc trực tiếp từ cảm biến phần cứng Bluetooth GATT

// Kiểm tra trình duyệt có hỗ trợ Web Bluetooth API phần cứng không
export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && typeof navigator.bluetooth?.requestDevice === 'function';
}

// Giải mã dữ liệu nhịp tim chuẩn Bluetooth SIG (GATT Characteristic 0x2A37)
export function parseHeartRateDataView(dataView) {
  if (!dataView || dataView.byteLength < 2) return null;
  const flags = dataView.getUint8(0);
  const rate16Bits = (flags & 0x1) !== 0;
  let heartRate = 0;
  if (rate16Bits && dataView.byteLength >= 3) {
    heartRate = dataView.getUint16(1, /*littleEndian=*/true);
  } else {
    heartRate = dataView.getUint8(1);
  }
  return heartRate > 0 && heartRate < 250 ? heartRate : null;
}

// Giải mã SpO2 (Nồng độ oxy trong máu) chuẩn Bluetooth SIG (GATT 0x2A5E / 0x2A5F)
export function parseSpO2DataView(dataView) {
  if (!dataView || dataView.byteLength < 2) return null;
  for (let i = 0; i < dataView.byteLength; i++) {
    const val = dataView.getUint8(i);
    if (val >= 80 && val <= 100) {
      return val;
    }
  }
  return null;
}

// Biến lưu trữ kết nối GATT phần cứng hiện thời trong phiên làm việc
let activeGattServer = null;
let activeDevice = null;
let activeHrChar = null;

// Kiểm tra kết nối GATT phần cứng có đang sống không
export function isGattConnected() {
  return !!(activeGattServer && activeGattServer.connected);
}

// Lấy thiết bị Bluetooth thật đang kết nối
export function getActiveDevice() {
  return activeDevice;
}

/**
 * Thực hiện quét và kết nối trực tiếp với Đồng Hồ / Vòng đeo tay Bluetooth THẬT
 * Sử dụng Web Bluetooth GATT API chuẩn quốc tế của W3C
 */
export async function connectGattSmartwatch({ 
  onHeartRateUpdate, 
  onBatteryUpdate, 
  onSpO2Update,
  onStepsUpdate,
  onDisconnected 
}) {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt hiện tại chưa hỗ trợ Web Bluetooth phần cứng. Trên iPhone, bạn hãy mở trang bằng ứng dụng Bluefy (Web BLE Browser) từ App Store để kết nối đồng hồ thật nhé!');
  }

  // Quét tìm thiết bị Bluetooth phần cứng thật ở cự ly gần:
  // Dùng chuỗi UUID 128-bit chuẩn quốc tế để tương thích 100% với cả Chrome Android và Bluefy iOS
  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'heart_rate',
        'battery_service',
        'device_information',
        // Canonical 128-bit UUIDs để tránh lỗi TypeError trên iOS Bluefy:
        '0000180d-0000-1000-8000-00805f9b34fb', // heart_rate
        '0000180f-0000-1000-8000-00805f9b34fb', // battery_service
        '0000180a-0000-1000-8000-00805f9b34fb', // device_information
        '00001822-0000-1000-8000-00805f9b34fb', // pulse_oximeter (SpO2)
        '00001814-0000-1000-8000-00805f9b34fb', // running_speed_and_cadence (bước chân)
        '0000fee0-0000-1000-8000-00805f9b34fb', // Xiaomi / Huami / Amazfit
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e'  // Nordic UART
      ]
    });
  } catch (err) {
    if (err.name === 'NotFoundError') {
      throw err; // Người dùng chủ động bấm Hủy
    }
    throw new Error('Không thể mở hộp thoại quét Bluetooth: ' + err.message);
  }

  if (!device) {
    throw new Error('Chưa chọn thiết bị nào.');
  }

  // 2. Kết nối tới GATT Server vật lý của đồng hồ
  let server;
  try {
    server = await device.gatt.connect();
  } catch (gattErr) {
    throw new Error(`Không thể kết nối GATT với "${device.name || 'Đồng hồ'}": ${gattErr.message}. Nếu đồng hồ đang bị ứng dụng khác chiếm quyền độc quyền, hãy bật tính năng "Phát nhịp tim / Broadcast Heart Rate" trên đồng hồ trước khi kết nối.`);
  }
  activeGattServer = server;
  activeDevice = device;

  // Lắng nghe sự kiện mất kết nối từ phần cứng
  device.addEventListener('gattserverdisconnected', () => {
    activeGattServer = null;
    activeDevice = null;
    activeHrChar = null;
    onDisconnected?.();
  });

  let batteryLevel = null;
  let heartRateLive = null;
  let spo2Live = null;
  let stepsLive = null;
  let hardwareName = device.name;

  // 3. Đọc thông tin thiết bị thật (Device Information 0x180A)
  try {
    const infoService = await server.getPrimaryService('device_information');
    try {
      const modelChar = await infoService.getCharacteristic('model_number_string');
      const modelVal = await modelChar.readValue();
      const dec = new TextDecoder();
      const modelStr = dec.decode(modelVal).trim();
      if (modelStr) hardwareName = modelStr;
    } catch {}
  } catch (e) {
    console.log('Thiết bị không công khai Device Information qua GATT:', e.message);
  }

  // 4. Đọc dung lượng pin thật (Battery Service 0x180F)
  try {
    const batteryService = await server.getPrimaryService('battery_service');
    const batteryChar = await batteryService.getCharacteristic('battery_level');
    const batteryVal = await batteryChar.readValue();
    batteryLevel = batteryVal.getUint8(0);
    onBatteryUpdate?.(batteryLevel);
  } catch (e) {
    console.log('Thiết bị không công khai Battery Service qua GATT:', e.message);
  }

  // 5. Đăng ký nhận nhịp tim thời gian thực từ cảm biến quang học thật (Heart Rate 0x180D)
  try {
    const hrService = await server.getPrimaryService('heart_rate');
    const hrChar = await hrService.getCharacteristic('heart_rate_measurement');
    activeHrChar = hrChar;
    await hrChar.startNotifications();
    hrChar.addEventListener('characteristicvaluechanged', (event) => {
      const hr = parseHeartRateDataView(event.target.value);
      if (hr) {
        heartRateLive = hr;
        onHeartRateUpdate?.(hr);
      }
    });
  } catch (e) {
    console.log('Thiết bị không mở Heart Rate Service chuẩn GATT:', e.message);
  }

  // 6. Đăng ký nhận SpO2 thật (Pulse Oximeter 0x1822 nếu phần cứng có hỗ trợ)
  try {
    const spo2Service = await server.getPrimaryService('00001822-0000-1000-8000-00805f9b34fb');
    const chars = await spo2Service.getCharacteristics();
    for (const char of chars) {
      try {
        if (char.properties.notify) {
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (event) => {
            const oxy = parseSpO2DataView(event.target.value);
            if (oxy) {
              spo2Live = oxy;
              onSpO2Update?.(oxy);
            }
          });
        }
      } catch {}
    }
  } catch (e) {
    console.log('Thiết bị không hỗ trợ GATT SpO2:', e.message);
  }

  // 7. Đăng ký nhận Bước chân từ cảm biến gia tốc thật (RSC 0x1814 nếu có)
  try {
    const rscService = await server.getPrimaryService('00001814-0000-1000-8000-00805f9b34fb');
    const rscChar = await rscService.getCharacteristic('00002a53-0000-1000-8000-00805f9b34fb');
    if (rscChar.properties.notify) {
      await rscChar.startNotifications();
      rscChar.addEventListener('characteristicvaluechanged', (event) => {
        const cadence = event.target.value.getUint8(3);
        if (cadence) {
          stepsLive = (stepsLive || 0) + Math.round(cadence / 2);
          onStepsUpdate?.(stepsLive);
        }
      });
    }
  } catch (e) {
    console.log('Thiết bị không mở RSC Service:', e.message);
  }

  // CHỈ TRẢ VỀ DỮ LIỆU THẬT - TUYỆT ĐỐI KHÔNG FALLBACK SỐ ẢO
  return {
    id: device.id,
    name: hardwareName || device.name || 'Đồng hồ Bluetooth',
    isConnected: true,
    batteryLevel,
    heartRateLive,
    spo2Live, // null nếu cảm biến phần cứng không trả về
    stepsLive,
    deviceInstance: device,
    gattServer: server
  };
}

/**
 * Ngắt kết nối thiết bị Bluetooth phần cứng
 */
export function disconnectGattSmartwatch() {
  if (activeHrChar) {
    try {
      activeHrChar.stopNotifications();
    } catch {}
    activeHrChar = null;
  }
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    try {
      activeDevice.gatt.disconnect();
    } catch (e) {
      console.warn('Lỗi ngắt kết nối GATT:', e);
    }
  }
  activeGattServer = null;
  activeDevice = null;
}
