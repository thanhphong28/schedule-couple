// components/health/ConnectedDevices.jsx
// Quản lý & Kết nối Đồng Hồ Thông Minh THỰC TẾ
// CHỈ hỗ trợ kết nối phần cứng Bluetooth GATT (Web Bluetooth API) thật, không nhập tay
import { useState } from 'react';
import { 
  Watch, 
  Bluetooth, 
  Unlink, 
  Heart, 
  Battery, 
  Droplet,
  Sparkles,
  Info,
  Footprints,
  Smartphone
} from 'lucide-react';
import { showToast } from '../shared/Toast.jsx';
import {
  connectGattSmartwatch,
  disconnectGattSmartwatch,
  isWebBluetoothSupported
} from '../../services/bluetoothSmartwatch.js';

export default function ConnectedDevices({
  myActivity,
  partnerActivity,
  partner,
  onSyncActivity,
  onSendCheer
}) {
  // 1. Trạng thái thiết bị kết nối thật (Chỉ giữ nếu là thiết bị GATT Bluetooth thật)
  const [device, setDevice] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sc_connected_smartwatch') || 'null');
      if (saved?.isManual) {
        localStorage.removeItem('sc_connected_smartwatch');
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  });

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);

  // 2. Dữ liệu cảm biến phần cứng thật (không có số liệu nhập tay)
  const [liveHeartRate, setLiveHeartRate] = useState(() => {
    return device?.heartRateLive || myActivity?.heart_rate_avg || null;
  });
  const [liveSpO2, setLiveSpO2] = useState(() => {
    return device?.spo2Live || null;
  });
  const [batteryLevel, setBatteryLevel] = useState(() => {
    return device?.batteryLevel || null;
  });
  const [stepsLive, setStepsLive] = useState(() => {
    return device?.stepsLive || myActivity?.steps || 0;
  });

  // 3. KẾT NỐI BLUETOOTH PHẦN CỨNG THẬT (Web Bluetooth API)
  const handleBluetoothConnect = async () => {
    if (!isWebBluetoothSupported()) {
      showToast('Trình duyệt hiện tại chưa hỗ trợ Web Bluetooth. Hãy dùng Google Chrome trên điện thoại Android nhé!', 'error');
      return;
    }

    try {
      setIsScanningBluetooth(true);
      showToast('Đang mở hộp thoại quét Bluetooth của thiết bị...', 'info');

      const result = await connectGattSmartwatch({
        onHeartRateUpdate: (hr) => {
          setLiveHeartRate(hr);
          onSyncActivity?.({
            heartRateAvg: hr,
            source: result.name || 'Bluetooth GATT'
          });
        },
        onBatteryUpdate: (bat) => {
          setBatteryLevel(bat);
        },
        onSpO2Update: (oxy) => {
          setLiveSpO2(oxy);
        },
        onStepsUpdate: (st) => {
          setStepsLive(st);
          onSyncActivity?.({
            steps: st,
            activeMinutes: Math.round(st / 110),
            caloriesBurned: Math.round(st * 0.038),
            source: result.name || 'Bluetooth GATT'
          });
        },
        onDisconnected: () => {
          setDevice(null);
          localStorage.removeItem('sc_connected_smartwatch');
          showToast('Đồng hồ đã ngắt kết nối Bluetooth', 'info');
        }
      });

      const connectedInfo = {
        id: result.id,
        name: result.name,
        brand: 'Bluetooth BLE Thật',
        icon: '⌚',
        isGatt: true,
        connectionType: 'gatt_ble',
        batteryLevel: result.batteryLevel,
        heartRateLive: result.heartRateLive,
        spo2Live: result.spo2Live,
        stepsLive: result.stepsLive,
        connectedAt: new Date().toISOString()
      };

      setDevice(connectedInfo);
      localStorage.setItem('sc_connected_smartwatch', JSON.stringify(connectedInfo));
      showToast(`Đã ghép nối Bluetooth thành công với [${result.name}]! 🎉`, 'success');

      if (result.batteryLevel !== null) setBatteryLevel(result.batteryLevel);
      if (result.heartRateLive !== null) setLiveHeartRate(result.heartRateLive);

    } catch (err) {
      if (err.name === 'NotFoundError') {
        showToast('Bạn đã đóng hoặc hủy chọn thiết bị Bluetooth', 'info');
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  // 4. Ngắt kết nối đồng hồ
  const handleDisconnect = () => {
    disconnectGattSmartwatch();
    setDevice(null);
    setLiveHeartRate(null);
    setBatteryLevel(null);
    localStorage.removeItem('sc_connected_smartwatch');
    showToast('Đã ngắt kết nối đồng hồ', 'info');
  };

  // 5. Tính toán chỉ số hiển thị thực tế
  const currentSteps = stepsLive || myActivity?.steps || 0;
  const currentCalories = myActivity?.calories_burned || Math.round(currentSteps * 0.038);

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-[32px] border border-cyan-500/20 shadow-lg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header Thẻ Đồng Hồ */}
      <div className="flex items-center justify-between mb-3.5 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white">
            <Watch size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">Đồng Hồ Thông Minh</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                device 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-white/10 text-zinc-400'
              }`}>
                {device ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>GATT Bluetooth Realtime</span>
                  </>
                ) : (
                  'Chưa kết nối'
                )}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              {device 
                ? `Đang đồng bộ dữ liệu thật cho ${partner?.display_name || 'người yêu'}` 
                : 'Chỉ đồng bộ trực tiếp từ phần cứng Bluetooth'}
            </p>
          </div>
        </div>

        {/* Nút hành động góc phải */}
        {device ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="p-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl transition-all active:scale-95 flex items-center gap-1 text-[11px] font-bold px-2.5"
            title="Ngắt liên kết"
          >
            <Unlink size={13} />
            <span>Ngắt kết nối</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isScanningBluetooth}
            onClick={handleBluetoothConnect}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/25 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Bluetooth size={13} className={isScanningBluetooth ? 'animate-spin' : ''} />
            <span>{isScanningBluetooth ? 'Đang quét...' : 'Kết nối'}</span>
          </button>
        )}
      </div>

      {/* NỘI DUNG HIỂN THỊ */}
      {device ? (
        /* KHI ĐÃ KẾT NỐI BLUETOOTH THẬT */
        <div className="space-y-3">
          {/* Thanh thông tin thiết bị */}
          <div className="p-3 bg-zinc-900/90 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-lg shadow-inner">
                {device.icon || '⌚'}
              </div>
              <div>
                <span className="text-xs font-black text-white block">{device.name}</span>
                <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1">
                  <Smartphone size={10} className="text-cyan-400" />
                  <span>Kết nối phần cứng BLE Live</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {batteryLevel !== null && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 flex items-center gap-1">
                  <Battery size={11} className="text-emerald-400" />
                  {batteryLevel}%
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Thời gian thực</span>
              </span>
            </div>
          </div>

          {/* Grid 4 Chỉ Số Sức Khỏe Lớn Từ Cảm Biến Thật */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* 1. Nhịp tim */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-300 mb-0.5">
                <Heart size={13} className="text-rose-400 fill-rose-400" />
                <span>Nhịp tim</span>
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                {liveHeartRate ? `${liveHeartRate}` : '--'}
                <span className="text-xs font-bold text-zinc-400 ml-1">bpm</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Cảm biến BLE thật
              </span>
            </div>

            {/* 2. Nồng độ Oxy máu (SpO2) */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 mb-0.5">
                <Droplet size={13} className="text-cyan-400 fill-cyan-400" />
                <span>Oxy máu (SpO2)</span>
              </div>
              <span className="text-xl font-black text-cyan-300 tracking-tight">
                {liveSpO2 ? `${liveSpO2}%` : '--'}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                {liveSpO2 ? 'Cảm biến BLE' : 'Chưa có chỉ số'}
              </span>
            </div>

            {/* 3. Bước chân */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 mb-0.5">
                <Footprints size={13} className="text-amber-400" />
                <span>Bước chân hôm nay</span>
              </div>
              <span className="text-base font-black text-white tracking-tight">
                {currentSteps > 0 ? currentSteps.toLocaleString() : '--'} <span className="text-[10px] font-bold text-zinc-400">bước</span>
              </span>
              <span className="text-[10px] text-amber-400 font-medium mt-0.5">
                ~{currentCalories} kcal tiêu hao
              </span>
            </div>

            {/* 4. Trạng thái kết nối */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 mb-0.5">
                <Bluetooth size={13} className="text-indigo-400" />
                <span>Kênh truyền</span>
              </div>
              <span className="text-sm font-black text-emerald-400 tracking-tight flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Trực tiếp GATT</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Không qua trung gian
              </span>
            </div>
          </div>

          {/* Thanh hiển thị hoạt động người yêu */}
          {partner && (
            <div className="p-2.5 bg-gradient-to-r from-rose-950/30 to-purple-950/30 rounded-2xl border border-rose-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💑</span>
                <div>
                  <span className="text-white font-bold block text-[11px]">
                    {partner.display_name || partner.full_name || 'Người yêu'}: {partnerActivity?.steps ? `${partnerActivity.steps.toLocaleString()} bước` : 'Chưa kết nối đồng hồ'}
                  </span>
                  <span className="text-[10px] text-rose-300/80">
                    {partnerActivity?.heart_rate_avg ? `Nhịp tim ~${partnerActivity.heart_rate_avg} bpm` : 'Dữ liệu được bảo mật an toàn'}
                  </span>
                </div>
              </div>

              {onSendCheer && (
                <button
                  type="button"
                  onClick={() => onSendCheer('workout', 'Cùng nhau vận động và giữ sức khỏe thật tốt nhé BABI! 🏃‍♂️💖')}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-[10px] transition-all active:scale-95 flex items-center gap-1"
                >
                  <Sparkles size={11} />
                  <span>Cổ vũ</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* KHI CHƯA KẾT NỐI: GIAO DIỆN CHỈ KẾT NỐI THẬT, KHÔNG CÓ NHẬP TAY */
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
            <Watch size={24} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white block mb-1">
              Kết Nối Đồng Hồ Thông Minh Thật
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Đồng bộ trực tiếp nhịp tim, oxy trong máu (SpO2) và bước chân từ cảm biến phần cứng qua Bluetooth GATT chuẩn.
            </p>
          </div>

          {isIOS && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left text-amber-200 text-[11px] flex items-start gap-2 max-w-xs mx-auto">
              <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                Apple Safari trên iPhone không hỗ trợ Web Bluetooth. Để kết nối trực tiếp đồng hồ, bạn hãy mở trang trên thiết bị Android dùng trình duyệt Chrome.
              </p>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              disabled={isScanningBluetooth}
              onClick={handleBluetoothConnect}
              className="w-full max-w-xs mx-auto py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Bluetooth size={15} className={isScanningBluetooth ? 'animate-spin' : ''} />
              <span>{isScanningBluetooth ? 'Đang mở Bluetooth máy...' : 'Quét & Kết Nối Bluetooth Thật'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
