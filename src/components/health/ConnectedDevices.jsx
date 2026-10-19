// components/health/ConnectedDevices.jsx
// Quản lý & Kết nối Đồng Hồ Thông Minh THỰC TẾ 100% (Real Hardware Bluetooth GATT)
// Tuyệt đối KHÔNG kết nối giả trên UI, KHÔNG lưu trạng thái ảo, CHỈ hiển thị kết nối khi phần cứng thật đang truyền
import { useState, useEffect } from 'react';
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
  Smartphone,
  Copy,
  Check,
  Flame,
  Radio,
  AlertCircle
} from 'lucide-react';
import { showToast } from '../shared/Toast.jsx';
import {
  connectGattSmartwatch,
  disconnectGattSmartwatch,
  isWebBluetoothSupported,
  isGattConnected,
  getActiveDevice
} from '../../services/bluetoothSmartwatch.js';

export default function ConnectedDevices({
  myActivity,
  partnerActivity,
  partner,
  onSyncActivity,
  onSendCheer
}) {
  // Xóa sạch mọi dữ liệu kết nối ảo hoặc giả lập còn sót trong localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('sc_connected_smartwatch');
    } catch {}
  }, []);

  // 1. Trạng thái kết nối phần cứng THẬT:
  // CHỈ chấp nhận thiết bị khi phiên GATT thực tế đang hoạt động (isGattConnected() === true)
  // Tuyệt đối không giả vờ đã kết nối khi vừa tải lại trang!
  const [device, setDevice] = useState(() => {
    if (isGattConnected()) {
      const active = getActiveDevice();
      return active ? { id: active.id, name: active.name || 'Đồng hồ Bluetooth' } : null;
    }
    return null;
  });

  // Tên thiết bị đã ghép nối gần nhất (chỉ mang tính tham khảo khi chưa kết nối)
  const [lastPairedWatch, setLastPairedWatch] = useState(() => {
    try {
      return localStorage.getItem('sc_last_paired_smartwatch_name') || null;
    } catch {
      return null;
    }
  });

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const hasWebBluetooth = isWebBluetoothSupported();

  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 2. Dữ liệu cảm biến phần cứng thật (100% từ Bluetooth GATT đang truyền trực tiếp)
  const [liveHeartRate, setLiveHeartRate] = useState(null);
  const [liveSpO2, setLiveSpO2] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [stepsLive, setStepsLive] = useState(null);

  // 3. KẾT NỐI BLUETOOTH PHẦN CỨNG THẬT (Web Bluetooth GATT)
  const handleBluetoothConnect = async () => {
    if (!isWebBluetoothSupported()) {
      if (isIOS) {
        showToast('Apple Safari trên iPhone chặn Web Bluetooth phần cứng. Hãy mở ứng dụng Bluefy (Web BLE Browser) từ App Store để kết nối đồng hồ thật!', 'info');
      } else {
        showToast('Trình duyệt hiện tại chưa hỗ trợ Web Bluetooth. Hãy mở ứng dụng bằng Google Chrome hoặc Edge để kết nối đồng hồ thật!', 'error');
      }
      return;
    }

    try {
      setIsScanningBluetooth(true);
      showToast('Đang mở hộp thoại quét Bluetooth của hệ điều hành...', 'info');

      const result = await connectGattSmartwatch({
        onHeartRateUpdate: (hr) => {
          setLiveHeartRate(hr);
          onSyncActivity?.({
            heartRateAvg: hr,
            source: result.name || 'Bluetooth GATT Thật'
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
            source: result.name || 'Bluetooth GATT Thật'
          });
        },
        onDisconnected: () => {
          setDevice(null);
          setLiveHeartRate(null);
          setLiveSpO2(null);
          setBatteryLevel(null);
          setStepsLive(null);
          showToast('Đồng hồ thật đã ngắt kết nối Bluetooth', 'info');
        }
      });

      const connectedInfo = {
        id: result.id,
        name: result.name,
        batteryLevel: result.batteryLevel,
        heartRateLive: result.heartRateLive,
        spo2Live: result.spo2Live,
        stepsLive: result.stepsLive
      };

      setDevice(connectedInfo);
      setLastPairedWatch(result.name);
      try {
        localStorage.setItem('sc_last_paired_smartwatch_name', result.name);
      } catch {}

      showToast(`Đã ghép nối Bluetooth thật thành công với [${result.name}]! 🎉`, 'success');

      if (result.batteryLevel !== null) setBatteryLevel(result.batteryLevel);
      if (result.heartRateLive !== null) setLiveHeartRate(result.heartRateLive);
      if (result.spo2Live !== null) setLiveSpO2(result.spo2Live);
      if (result.stepsLive !== null) setStepsLive(result.stepsLive);

    } catch (err) {
      if (err.name === 'NotFoundError') {
        showToast('Đã đóng hộp thoại quét thiết bị Bluetooth', 'info');
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  // 4. Ngắt kết nối đồng hồ phần cứng
  const handleDisconnect = () => {
    disconnectGattSmartwatch();
    setDevice(null);
    setLiveHeartRate(null);
    setLiveSpO2(null);
    setBatteryLevel(null);
    setStepsLive(null);
    showToast('Đã ngắt kết nối đồng hồ Bluetooth', 'info');
  };

  const handleCopyAppUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      showToast('Đã sao chép link ứng dụng vào bộ nhớ tạm! 📋', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 5. Chỉ số bước chân (Ưu tiên cảm biến thật)
  const currentSteps = stepsLive !== null ? stepsLive : (myActivity?.steps || 0);
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
              <h3 className="text-sm font-black text-white">Đồng Hồ Thông Minh Thật</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                device 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-white/10 text-zinc-400'
              }`}>
                {device ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live GATT Hardware</span>
                  </>
                ) : (
                  'Chưa kết nối'
                )}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              {device 
                ? `Đang truyền cảm biến phần cứng thật cho ${partner?.display_name || 'người yêu'}` 
                : '100% cảm biến phần cứng thật (Tuyệt đối không kết nối giả)'}
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
            <span>{isScanningBluetooth ? 'Đang mở Bluetooth...' : 'Quét Đồng Hồ Thật'}</span>
          </button>
        )}
      </div>

      {/* NỘI DUNG HIỂN THỊ */}
      {device ? (
        /* KHI ĐANG CÓ PHIÊN KẾT NỐI PHẦN CỨNG THẬT TRỰC TIẾP */
        <div className="space-y-3">
          {/* Thanh thông tin thiết bị phần cứng thật */}
          <div className="p-3 bg-zinc-900/90 rounded-2xl border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-lg shadow-inner">
                ⌚
              </div>
              <div>
                <span className="text-xs font-black text-white block">{device.name}</span>
                <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1">
                  <Smartphone size={10} className="text-cyan-400" />
                  <span>Cảm biến BLE đang phát sóng</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {batteryLevel !== null ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 flex items-center gap-1">
                  <Battery size={11} className="text-emerald-400" />
                  {batteryLevel}%
                </span>
              ) : (
                <span className="text-[9px] text-zinc-500 font-medium">Pin qua GATT: Không mở</span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Trực tiếp</span>
              </span>
            </div>
          </div>

          {/* Grid 4 Chỉ Số Sức Khỏe Lớn Từ Cảm Biến Phần Cứng Thật */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* 1. Nhịp tim */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-300 mb-0.5">
                <Heart size={13} className={`text-rose-400 fill-rose-400 ${liveHeartRate ? 'animate-pulse' : ''}`} />
                <span>Nhịp tim</span>
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                {liveHeartRate ? `${liveHeartRate}` : '--'}
                <span className="text-xs font-bold text-zinc-400 ml-1">bpm</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                {liveHeartRate ? 'Cảm biến quang học BLE' : 'Đang chờ tín hiệu cổ tay...'}
              </span>
            </div>

            {/* 2. Nồng độ Oxy máu (SpO2) */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 mb-0.5">
                <Droplet size={13} className="text-cyan-400 fill-cyan-400" />
                <span>Oxy máu (SpO2)</span>
              </div>
              <span className="text-xl font-black text-cyan-300 tracking-tight">
                {liveSpO2 !== null ? `${liveSpO2}%` : '--'}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                {liveSpO2 !== null ? 'Cảm biến BLE thật' : 'Model không mở GATT SpO2'}
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
              <span className="text-[10px] text-amber-400 font-medium mt-0.5 flex items-center gap-0.5">
                <Flame size={10} />
                <span>~{currentCalories} kcal tiêu hao</span>
              </span>
            </div>

            {/* 4. Kênh truyền */}
            <div className="p-3 bg-zinc-950/70 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 mb-0.5">
                <Radio size={13} className="text-indigo-400 animate-pulse" />
                <span>Kênh truyền</span>
              </div>
              <span className="text-xs font-black text-emerald-400 tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>GATT Hardware Live</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                100% Cảm biến thực tế
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
                    {partnerActivity?.heart_rate_avg ? `Nhịp tim ~${partnerActivity.heart_rate_avg} bpm` : 'Dữ liệu phần cứng được mã hóa'}
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
        /* KHI CHƯA CÓ PHIÊN KẾT NỐI PHẦN CỨNG: HIỂN THỊ RÕ RÀNG TRẠNG THÁI THẬT */
        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/10 text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
            <Watch size={24} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white block mb-1">
              Chỉ Kết Nối Đồng Hồ Phần Cứng Thật
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
              Ứng dụng chỉ đọc trực tiếp dữ liệu cảm biến nhịp tim và bước chân từ đồng hồ thông minh qua sóng Bluetooth GATT chuẩn. Tuyệt đối không giả lập dữ liệu trên giao diện.
            </p>
          </div>

          {/* Ghi nhớ thiết bị đã ghép nối gần nhất */}
          {lastPairedWatch && (
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-left flex items-center justify-between text-xs max-w-xs mx-auto">
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Thiết bị đã ghép nối gần nhất:</span>
                <span className="text-xs font-bold text-cyan-300">⌚ {lastPairedWatch}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                Đang ngắt kết nối
              </span>
            </div>
          )}

          {/* Hướng dẫn riêng cho thiết bị iOS Safari */}
          {isIOS && !hasWebBluetooth && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left text-amber-200 text-xs space-y-2 max-w-xs mx-auto">
              <div className="flex items-start gap-2">
                <Info size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white text-[11px] mb-0.5">
                    Để kết nối Bluetooth thật trên iPhone:
                  </span>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Trình duyệt Apple Safari và PWA trên iPhone mặc định bị Apple khóa Web Bluetooth phần cứng. Hãy tải ứng dụng miễn phí <strong>Bluefy (Web BLE Browser)</strong> từ App Store và mở link web này để quét đồng hồ thật 100%.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyAppUrl}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[11px] font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Đã sao chép link web' : 'Sao chép link để mở trong Bluefy 📋'}</span>
              </button>
            </div>
          )}

          {/* Mẹo kết nối thật */}
          <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/15 rounded-xl text-left text-[11px] text-zinc-300 max-w-xs mx-auto space-y-1">
            <span className="font-bold text-cyan-300 block flex items-center gap-1">
              <AlertCircle size={12} />
              Mẹo để đồng hồ mở kết nối Bluetooth:
            </span>
            <p className="text-zinc-400 leading-normal">
              1. Bật Bluetooth trên điện thoại / máy tính.<br />
              2. Nếu dùng Apple Watch / Garmin / Samsung: Hãy bật tính năng <strong>"Phát nhịp tim / Broadcast Heart Rate"</strong> trên đồng hồ để đồng hồ phát sóng BLE cho trình duyệt tìm thấy.
            </p>
          </div>

          {/* Nút bấm quét Bluetooth phần cứng thật */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isScanningBluetooth}
              onClick={handleBluetoothConnect}
              className="w-full max-w-xs mx-auto py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Bluetooth size={15} className={isScanningBluetooth ? 'animate-spin' : ''} />
              <span>{isScanningBluetooth ? 'Đang mở Bluetooth máy...' : 'Quét & Kết Nối Đồng Hồ Thật'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

