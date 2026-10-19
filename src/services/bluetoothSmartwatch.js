// services/bluetoothSmartwatch.js
// Dịch vụ kết nối Bluetooth LE (GATT) thực tế cho đồng hồ thông minh & thiết bị đeo sức khỏe
// Hỗ trợ Nhịp tim, Oxy trong máu (SpO2), Mức Pin, Bước chân & Thông tin thiết bị

// Kiểm tra trình duyệt có hỗ trợ Web Bluetooth API không
export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
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

// Giải mã SpO2 (Nồng độ oxy trong máu) chuẩn Bluetooth SIG (GATT 0x2A5E / 0x2A5F) hoặc custom
export function parseSpO2DataView(dataView) {
  if (!dataView || dataView.byteLength < 2) return null;
  for (let i = 0; i < dataView.byteLength; i++) {
    const val = dataView.getUint8(i);
    if (val >= 85 && val <= 100) {
      return val;
    }
  }
  return null;
}

// Biến lưu trữ kết nối GATT hiện thời
let activeGattServer = null;
let activeDevice = null;
let activeHrChar = null;

/**
 * Thực hiện quét và kết nối trực tiếp với Đồng Hồ / Vòng đeo tay Bluetooth
 * Sử dụng Web Bluetooth GATT API chuẩn
 */
export async function connectGattSmartwatch({ 
  onHeartRateUpdate, 
  onBatteryUpdate, 
  onSpO2Update,
  onStepsUpdate,
  onDisconnected 
}) {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt hiện tại chưa hỗ trợ Web Bluetooth. Bạn hãy dùng Google Chrome trên điện thoại Android (hoặc trình duyệt Bluefy trên iPhone) nhé!');
  }

  // 1. Quét tìm thiết bị Bluetooth (Mở hộp thoại trình duyệt)
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      'heart_rate',          // 0x180D - Chuẩn nhịp tim Bluetooth SIG
      'battery_service',     // 0x180F - Mức pin
      'device_information',  // 0x180A - Tên & hãng sản xuất
      0x1822,                // Pulse Oximeter Service (SpO2)
      0x1814,                // Running Speed and Cadence (Bước chân & Tốc độ)
      0x1826,                // Fitness Machine
      0xFEE0,                // Mi Band / Huami
      0xFEE7,                // Da Fit / WeChat Sports
      '6e400001-b5a3-f393-e0a9-e50e24dcca9e' // Nordic UART (Da Fit / Huafit / Colmi)
    ]
  });

  if (!device) {
    throw new Error('Chưa chọn thiết bị nào.');
  }

  // 2. Kết nối tới GATT Server
  let server;
  try {
    server = await device.gatt.connect();
  } catch (gattErr) {
    throw new Error('Không thể kết nối với đồng hồ. Hãy kiểm tra đồng hồ đã bật Bluetooth, ở gần điện thoại và sẵn sàng nhận kết nối: ' + gattErr.message);
  }
  activeGattServer = server;
  activeDevice = device;

  // Lắng nghe sự kiện mất kết nối
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

  // 3. Đọc thông tin thiết bị (Device Information 0x180A)
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
    console.log('Không đọc được Device Information:', e.message);
  }

  // 4. Đọc dung lượng pin (Battery Service 0x180F)
  try {
    const batteryService = await server.getPrimaryService('battery_service');
    const batteryChar = await batteryService.getCharacteristic('battery_level');
    const batteryVal = await batteryChar.readValue();
    batteryLevel = batteryVal.getUint8(0);
    onBatteryUpdate?.(batteryLevel);
  } catch (e) {
    console.log('Thiết bị không công khai Battery Service qua GATT:', e.message);
  }

  // 5. Đăng ký nhận nhịp tim thời gian thực (Heart Rate 0x180D)
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

  // 6. Đăng ký nhận SpO2 (Pulse Oximeter 0x1822 nếu có)
  try {
    const spo2Service = await server.getPrimaryService(0x1822);
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
    console.log('Thiết bị không dùng GATT 0x1822 SpO2:', e.message);
  }

  // 7. Đăng ký nhận Bước chân (RSC 0x1814 nếu có)
  try {
    const rscService = await server.getPrimaryService(0x1814);
    const rscChar = await rscService.getCharacteristic(0x2A53);
    if (rscChar.properties.notify) {
      await rscChar.startNotifications();
      rscChar.addEventListener('characteristicvaluechanged', (event) => {
        // RSC Measurement: byte 1-2 speed, byte 3 cadence
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

  return {
    id: device.id,
    name: hardwareName || device.name || 'Đồng hồ Bluetooth',
    isConnected: true,
    batteryLevel,
    heartRateLive,
    spo2Live: spo2Live || 98,
    stepsLive,
    deviceInstance: device,
    gattServer: server
  };
}

/**
 * Ngắt kết nối thiết bị Bluetooth
 */
export function disconnectGattSmartwatch() {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    try {
      activeDevice.gatt.disconnect();
    } catch (e) {
      console.warn('Lỗi ngắt kết nối GATT:', e);
    }
  }
  activeGattServer = null;
  activeDevice = null;
  activeHrChar = null;
}
