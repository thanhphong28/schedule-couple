// context/LocationContext.jsx
// Global Background Geolocation & Route Tracker Provider
// Quản lý GPS toàn cục, Chế độ Tiết kiệm pin thông minh (Smart Battery Saver), Chế độ Đi đường Live (Live Road Mode) với bộ hẹn giờ tự tắt, Bộ lọc đứng yên (Stationary Filter) và Lưu bản đồ Offline (Offline Map Pre-caching)
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { 
  calculateDistance, 
  reverseGeocode, 
  getDeviceBatterySafe, 
  isLocationStale,
  getIpLocationFallback,
  calculateTrailDistance,
  generateTileUrlsForArea
} from '../services/geolocationService.js';
import { showToast } from '../components/shared/Toast.jsx';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { user, couple, partner } = useAuth();

  // 1. Vị trí của tôi (luôn có tọa độ để marker Tôi lập tức xuất hiện)
  const [myLocation, setMyLocation] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(`sc_loc_me_${user?.id}`) || 'null');
      if (cached?.latitude && cached?.longitude) return cached;
    } catch {}
    return {
      user_id: user?.id,
      latitude: 10.7960,
      longitude: 106.6840,
      accuracy: 100,
      heading: null,
      speed: 0,
      altitude: null,
      is_sharing: true,
      battery_level: null,
      is_charging: null,
      address_name: 'Đang định vị vị trí của bạn...',
      status_message: '',
      recorded_at: new Date().toISOString(),
      is_initial_placeholder: true
    };
  });

  // 2. Vị trí của người yêu
  const [partnerLocation, setPartnerLocation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_loc_partner_${partner?.id}`) || 'null');
    } catch {
      return null;
    }
  });

  // 3. Cài đặt chia sẻ vị trí
  const [isSharingEnabled, setIsSharingEnabled] = useState(() => {
    const saved = localStorage.getItem(`sc_share_enabled_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  // 4. CHẾ ĐỘ ĐỊNH VỊ THÔNG MINH: 'battery_saver' (Mặc định - Tiết kiệm pin tối đa) | 'live_road' (Chế độ đi đường)
  const [locationMode, setLocationModeState] = useState(() => {
    return localStorage.getItem(`sc_loc_mode_${user?.id}`) || 'battery_saver';
  });
  const [liveRoadRemainingMins, setLiveRoadRemainingMins] = useState(0);

  // 5. Trạng thái đứng yên (Stationary) vs Đang di chuyển (Moving)
  const [isStationary, setIsStationary] = useState(true);

  // 6. Trạng thái mạng (Online / Offline)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // 7. Cảnh báo pin yếu (< 20%)
  const [isLowBattery, setIsLowBattery] = useState(false);

  // 8. Lộ trình di chuyển (Breadcrumbs Trail)
  const [myTrail, setMyTrail] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`sc_trail_me_${user?.id}`) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [partnerTrail, setPartnerTrail] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`sc_trail_partner_${partner?.id}`) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [showRouteTrail, setShowRouteTrail] = useState(false);

  // 9. Danh sách địa điểm đã lưu
  const [savedPlaces, setSavedPlaces] = useState([]);

  // 10. Trạng thái GPS & Realtime
  const [gpsStatus, setGpsStatus] = useState('searching'); // 'active' | 'searching' | 'denied' | 'error'
  const [gpsError, setGpsError] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [myStatusMessage, setMyStatusMessage] = useState('');

  // Refs quản lý throttles và timers
  const lastBroadcastTimeRef = useRef(0);
  const lastDbSaveTimeRef = useRef(0);
  const lastTrailSaveTimeRef = useRef(0);
  const lastPositionRef = useRef(null);
  const watchIdRef = useRef(null);
  const channelRef = useRef(null);
  const isMountedRef = useRef(true);
  const myTrailRef = useRef(myTrail);
  myTrailRef.current = myTrail;
  const locationModeRef = useRef(locationMode);
  locationModeRef.current = locationMode;
  const liveRoadExpiresAtRef = useRef(0);
  const hasMovedInLiveRoadRef = useRef(false);

  // Background Audio Keeper Refs (Chỉ kích hoạt khi ở chế độ 'live_road')
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const wakeLockRef = useRef(null);

  const myLocationRef = useRef(myLocation);
  myLocationRef.current = myLocation;
  const savedPlacesRef = useRef(savedPlaces);
  savedPlacesRef.current = savedPlaces;
  const myStatusMessageRef = useRef(myStatusMessage);
  myStatusMessageRef.current = myStatusMessage;

  // ─── TÍNH KHOẢNG CÁCH GIỮA HAI NGƯỜI ───
  const distanceBetweenMeters = useMemo(() => {
    if (!myLocation || !partnerLocation) return null;
    if (!partnerLocation.latitude || !partnerLocation.longitude) return null;
    if (partnerLocation.is_sharing === false) return null;
    return calculateDistance(
      myLocation.latitude,
      myLocation.longitude,
      partnerLocation.latitude,
      partnerLocation.longitude
    );
  }, [myLocation, partnerLocation]);

  const isPartnerStale = useMemo(() => {
    return isLocationStale(partnerLocation?.recorded_at, 180);
  }, [partnerLocation?.recorded_at]);

  // ─── THỐNG KÊ HÀNH TRÌNH HÔM NAY (TODAY STATS) ───
  const todayStats = useMemo(() => {
    const myDist = calculateTrailDistance(myTrail);
    const partnerDist = calculateTrailDistance(partnerTrail);
    return {
      myDistanceKm: myDist,
      partnerDistanceKm: partnerDist,
      closestDistanceMeters: distanceBetweenMeters,
      myPointsCount: myTrail.length,
      partnerPointsCount: partnerTrail.length
    };
  }, [myTrail, partnerTrail, distanceBetweenMeters]);

  // ─── TẠO FILE ÂM THANH TĨNH (CHỈ DÙNG KHI BẬT LIVE ROAD MODE) ───
  function createSilentAudioUrl() {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 8;
    const durationSec = 2;
    const dataSize = sampleRate * durationSec;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);
    new Uint8Array(buffer, 44, dataSize).fill(128);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // ─── KHỞI TẠO & HỦY BACKGROUND AUDIO KEEPER ───
  const startBackgroundKeeper = useCallback(async () => {
    try {
      if (!audioElementRef.current) {
        const silentUrl = createSilentAudioUrl();
        const audio = new Audio(silentUrl);
        audio.loop = true;
        audio.volume = 0.01;
        audioElementRef.current = audio;
      }
      await audioElementRef.current.play().catch(() => {});

      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          audioContextRef.current = ctx;
        }
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }

      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        const pName = partner?.display_name || partner?.full_name || 'Người yêu';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Couple Live Map 🛵',
          artist: `Đang bật chế độ đi đường chia sẻ cho ${pName}`,
          album: 'Schedule Couple Live Road Mode',
          artwork: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
        });
        navigator.mediaSession.playbackState = 'playing';

        try {
          navigator.mediaSession.setActionHandler('play', () => {
            audioElementRef.current?.play().catch(() => {});
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            audioElementRef.current?.play().catch(() => {});
          });
        } catch {}
      }

      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Background keeper activation notice:', err);
    }
  }, [partner?.display_name, partner?.full_name]);

  const stopBackgroundKeeper = useCallback(() => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.suspend().catch(() => {});
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    } catch (err) {
      console.warn('Background keeper stop error:', err);
    }
  }, []);

  // ─── KÍCH HOẠT / HỦY CHẾ ĐỘ ĐI ĐƯỜNG LIVE (LIVE ROAD MODE) ───
  const deactivateLiveRoad = useCallback((reason = '') => {
    setLocationModeState('battery_saver');
    locationModeRef.current = 'battery_saver';
    try {
      localStorage.setItem(`sc_loc_mode_${user?.id}`, 'battery_saver');
    } catch {}
    setLiveRoadRemainingMins(0);
    liveRoadExpiresAtRef.current = 0;
    hasMovedInLiveRoadRef.current = false;
    stopBackgroundKeeper();
    if (reason) {
      showToast(reason, 'info');
    }
  }, [user?.id, stopBackgroundKeeper]);

  const activateLiveRoad = useCallback((durationMins = 45) => {
    setLocationModeState('live_road');
    locationModeRef.current = 'live_road';
    try {
      localStorage.setItem(`sc_loc_mode_${user?.id}`, 'live_road');
    } catch {}
    const expireTime = Date.now() + durationMins * 60 * 1000;
    liveRoadExpiresAtRef.current = expireTime;
    setLiveRoadRemainingMins(durationMins);
    hasMovedInLiveRoadRef.current = false;
    startBackgroundKeeper();
    showToast(`Đã bật Chế độ Đi đường Live 🛵 (Tự tắt sau ${durationMins}p để bảo vệ pin)`, 'success');
  }, [user?.id, startBackgroundKeeper]);

  const setLocationMode = useCallback((mode, durationMins = 45) => {
    if (mode === 'live_road') {
      activateLiveRoad(durationMins);
    } else {
      deactivateLiveRoad('Đã chuyển sang chế độ Tiết kiệm pin 🍃');
    }
  }, [activateLiveRoad, deactivateLiveRoad]);

  // Bộ đếm lùi thời gian cho Live Road Mode & Tự động tắt khi hết giờ
  useEffect(() => {
    if (locationMode !== 'live_road') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const leftMs = liveRoadExpiresAtRef.current - now;
      if (leftMs <= 0) {
        deactivateLiveRoad('Hành trình đã kết thúc! Tự động chuyển về Chế độ Tiết kiệm pin 🍃');
      } else {
        setLiveRoadRemainingMins(Math.ceil(leftMs / 60000));
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [locationMode, deactivateLiveRoad]);

  // ─── LƯU LỘ TRÌNH VÀO DB VÀ LOCALSTORAGE (THROTTLED) ───
  const saveTrailToDatabase = useCallback(async (trailPoints) => {
    if (!user?.id || !couple?.id || !isSupabaseReady) return;
    try {
      const serializedTrail = JSON.stringify(trailPoints.slice(-60));
      await supabase.from('location_shares_config').upsert({
        user_id: user.id,
        couple_id: couple.id,
        is_sharing_enabled: isSharingEnabled,
        share_mode: serializedTrail,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to persist trail to DB:', err);
    }
  }, [user?.id, couple?.id, isSharingEnabled]);

  // ─── GỬI VỊ TRÍ LÊN DATABASE (COUPLE_LOCATIONS) ───
  const saveLocationToDatabase = useCallback(async (locData) => {
    if (!user?.id || !couple?.id || !isSupabaseReady) return;
    try {
      await supabase.from('couple_locations').upsert({
        user_id: user.id,
        couple_id: couple.id,
        latitude: locData.latitude,
        longitude: locData.longitude,
        accuracy: locData.accuracy,
        heading: locData.heading,
        speed: locData.speed,
        altitude: locData.altitude,
        is_sharing: true,
        battery_level: locData.battery_level,
        is_charging: locData.is_charging,
        address_name: locData.address_name,
        status_message: locData.status_message,
        recorded_at: locData.recorded_at,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Error saving location to Supabase:', err);
    }
  }, [user?.id, couple?.id]);

  // ─── XỬ LÝ KHI NHẬN TỌA ĐỘ GPS MỚI TỪ THIẾT BỊ (VỚI BỘ LỌC ĐỨNG YÊN TIẾT KIỆM PIN) ───
  const handleNewGpsPosition = useCallback(async (position) => {
    if (!isMountedRef.current) return;

    const { latitude, longitude, accuracy, heading, speed, altitude } = position.coords;
    setGpsStatus('active');
    setGpsError(null);

    const now = Date.now();
    const battery = await getDeviceBatterySafe();

    // 1. Kiểm tra pin yếu (< 20%) -> Tự kích hoạt Low Battery Guard
    if (battery && battery.level <= 20 && !battery.charging) {
      if (!isLowBattery) {
        setIsLowBattery(true);
        if (locationModeRef.current === 'live_road') {
          deactivateLiveRoad('Pin dưới 20%! Tự động chuyển về Chế độ Tiết kiệm pin 🪫');
        }
      }
    } else if (isLowBattery && battery && battery.level > 25) {
      setIsLowBattery(false);
    }

    // 2. BỘ LỌC ĐỨNG YÊN (STATIONARY FILTER): Kiểm tra xem người dùng có thực sự di chuyển không
    const prevPos = lastPositionRef.current;
    let distMoved = 0;
    if (prevPos) {
      distMoved = calculateDistance(prevPos.latitude, prevPos.longitude, latitude, longitude) || 0;
    }

    const isMoving = distMoved >= 20 || (speed !== null && speed > 1.2);
    setIsStationary(!isMoving);

    if (isMoving && locationModeRef.current === 'live_road') {
      hasMovedInLiveRoadRef.current = true;
    }

    // 3. TỰ ĐỘNG TẮT LIVE ROAD MODE KHI VỀ ĐẾN NHÀ (HOME GEOFENCE DETECTION)
    if (locationModeRef.current === 'live_road' && hasMovedInLiveRoadRef.current && savedPlaces.length > 0) {
      const homePlace = savedPlaces.find(p => p.category === 'home');
      if (homePlace) {
        const distToHome = calculateDistance(latitude, longitude, homePlace.latitude, homePlace.longitude);
        if (distToHome !== null && distToHome < 120) {
          deactivateLiveRoad('Đã về đến nhà an toàn! Tự động tắt Chế độ Đi đường 🏠');
        }
      }
    }

    const locPayload = {
      user_id: user?.id,
      latitude,
      longitude,
      accuracy: Math.round(accuracy || 0),
      heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
      speed: speed !== null && !isNaN(speed) ? Number(speed.toFixed(1)) : null,
      altitude: altitude !== null && !isNaN(altitude) ? Math.round(altitude) : null,
      is_sharing: isSharingEnabled,
      battery_level: battery ? battery.level : null,
      is_charging: battery ? battery.charging : null,
      address_name: 'Đang xác định địa chỉ...',
      status_message: myStatusMessage,
      recorded_at: new Date().toISOString(),
      is_initial_placeholder: false
    };

    setMyLocation(locPayload);
    lastPositionRef.current = { latitude, longitude };

    try {
      localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(locPayload));
    } catch {}

    // 4. Ghi nhận lộ trình di chuyển (Chỉ ghi khi thực sự di chuyển, lọc bỏ rung lắc đứng yên)
    const currentTrail = myTrailRef.current;
    const lastPoint = currentTrail[currentTrail.length - 1];
    let shouldAddPoint = false;

    if (!lastPoint) {
      shouldAddPoint = true;
    } else {
      const distFromLast = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
      if (distFromLast >= 22 || (isMoving && distFromLast >= 14)) {
        shouldAddPoint = true;
      }
    }

    const newTrailPoint = {
      lat: latitude,
      lng: longitude,
      speed: speed !== null && !isNaN(speed) ? Number(speed.toFixed(1)) : 0,
      heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
      timestamp: now
    };

    if (shouldAddPoint) {
      const updatedTrail = [...currentTrail.slice(-79), newTrailPoint];
      setMyTrail(updatedTrail);
      myTrailRef.current = updatedTrail;
      try {
        localStorage.setItem(`sc_trail_me_${user?.id}`, JSON.stringify(updatedTrail));
      } catch {}

      if (now - lastTrailSaveTimeRef.current >= 30000) {
        lastTrailSaveTimeRef.current = now;
        saveTrailToDatabase(updatedTrail);
      }
    }

    // 5. Tra cứu địa chỉ trong nền (chỉ gọi khi di chuyển để tiết kiệm mạng)
    if (isMoving || !myLocation?.address_name || myLocation.address_name.startsWith('Đang')) {
      reverseGeocode(latitude, longitude).then(addr => {
        if (addr && isMountedRef.current) {
          setMyLocation(prev => {
            if (prev?.latitude === latitude && prev?.longitude === longitude) {
              const updated = { ...prev, address_name: addr };
              try {
                localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(updated));
              } catch {}
              return updated;
            }
            return prev;
          });
        }
      }).catch(() => {});
    }

    if (!isSharingEnabled) return;

    // 6. THUẬT TOÁN ĐIỀU TIẾT MẠNG TIẾT KIỆM PIN:
    // - Khi di chuyển hoặc ở Live Road: Gửi thường xuyên (mỗi 3s - 5s).
    // - Khi đứng yên (Stationary): Giãn ra 90s - 180s để điện thoại ngủ sâu!
    const isLiveMode = locationModeRef.current === 'live_road';
    const minBroadcastInterval = isLiveMode ? 2500 : (isMoving ? 6000 : 90000);
    const minDbSaveInterval = isLiveMode ? 15000 : (isMoving ? 25000 : 180000);

    if (channelRef.current && (now - lastBroadcastTimeRef.current >= minBroadcastInterval)) {
      lastBroadcastTimeRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: {
          ...locPayload,
          trail_point: shouldAddPoint ? newTrailPoint : null,
          is_stationary: !isMoving,
          location_mode: locationModeRef.current
        }
      });
    }

    if (now - lastDbSaveTimeRef.current >= minDbSaveInterval) {
      lastDbSaveTimeRef.current = now;
      saveLocationToDatabase(locPayload);
    }
  }, [
    isSharingEnabled, 
    user?.id, 
    myStatusMessage, 
    savedPlaces, 
    isLowBattery, 
    deactivateLiveRoad, 
    saveLocationToDatabase, 
    saveTrailToDatabase
  ]);

  // ─── IP FALLBACK NẾU THIẾT BỊ KHÔNG CÓ GPS (DESKTOP) ───
  const applyFallbackLocation = useCallback(async () => {
    try {
      const ipLoc = await getIpLocationFallback();
      if (ipLoc && isMountedRef.current) {
        const fallbackPayload = {
          user_id: user?.id,
          latitude: ipLoc.latitude,
          longitude: ipLoc.longitude,
          accuracy: ipLoc.accuracy,
          heading: null,
          speed: 0,
          altitude: null,
          is_sharing: true,
          battery_level: null,
          is_charging: null,
          address_name: `${ipLoc.city}, ${ipLoc.region}`,
          status_message: myStatusMessage || '',
          recorded_at: new Date().toISOString(),
          is_ip_fallback: true
        };
        setMyLocation(prev => (prev?.latitude && !prev?.is_ip_fallback && !prev?.is_initial_placeholder) ? prev : fallbackPayload);
        setGpsStatus('active');
        try {
          localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(fallbackPayload));
        } catch {}

        reverseGeocode(ipLoc.latitude, ipLoc.longitude).then(addr => {
          if (addr && isMountedRef.current) {
            setMyLocation(prev => {
              if (prev?.latitude === ipLoc.latitude) {
                const updated = { ...prev, address_name: addr };
                try {
                  localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(updated));
                } catch {}
                return updated;
              }
              return prev;
            });
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('IP location fallback notice:', err);
    }
  }, [user?.id, myStatusMessage]);

  // ─── THEO DÕI GPS LIÊN TỤC ───
  const startWatchingLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Trình duyệt không hỗ trợ Geolocation API.');
      applyFallbackLocation();
      return;
    }

    setGpsStatus('searching');

    const options = {
      enableHighAccuracy: !isLowBattery, // Tự động giảm hao pin khi pin yếu
      timeout: 10000,
      maximumAge: 0
    };

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleNewGpsPosition(pos),
        (err) => {
          console.warn('Initial getCurrentPosition check:', err);
          applyFallbackLocation();
        },
        options
      );

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handleNewGpsPosition(pos),
        (error) => {
          console.warn('Geolocation watchPosition error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setGpsStatus('denied');
            setGpsError('Chưa cấp quyền truy cập vị trí cho trình duyệt.');
          } else {
            setGpsStatus('error');
            setGpsError(error.message || 'Lỗi định vị.');
            applyFallbackLocation();
          }
        },
        options
      );
    } catch (err) {
      console.warn('Error starting geolocation watch:', err);
      applyFallbackLocation();
      setGpsStatus('error');
    }
  }, [handleNewGpsPosition, applyFallbackLocation, isLowBattery]);

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ─── TOGGLE CHIA SẺ ───
  const toggleSharing = useCallback(async (enabled) => {
    setIsSharingEnabled(enabled);
    try {
      localStorage.setItem(`sc_share_enabled_${user?.id}`, enabled ? 'true' : 'false');
    } catch {}

    if (!enabled) {
      showToast('Đã dừng chia sẻ vị trí với người yêu 🔒', 'info');
      stopWatchingLocation();
      stopBackgroundKeeper();
    } else {
      setGpsStatus('searching');
      showToast('Đã bật chia sẻ vị trí với người yêu 📍', 'success');
      startWatchingLocation();
      if (locationModeRef.current === 'live_road') {
        startBackgroundKeeper();
      }
    }

    if (user?.id && couple?.id && isSupabaseReady) {
      try {
        await supabase.from('couple_locations').upsert({
          user_id: user.id,
          couple_id: couple.id,
          is_sharing: enabled,
          updated_at: new Date().toISOString()
        });

        channelRef.current?.send({
          type: 'broadcast',
          event: 'location_status_change',
          payload: { user_id: user.id, is_sharing: enabled }
        });
      } catch (err) {
        console.warn('Error updating sharing status:', err);
      }
    }
  }, [user?.id, couple?.id, startWatchingLocation, stopWatchingLocation, startBackgroundKeeper, stopBackgroundKeeper]);

  // ─── LƯU BẢN ĐỒ OFFLINE VÀO MÁY (PRE-CACHE) ───
  const downloadOfflineMapArea = useCallback(async (lat, lng) => {
    const centerLat = lat || myLocation?.latitude;
    const centerLng = lng || myLocation?.longitude;
    if (!centerLat || !centerLng) {
      showToast('Chưa có tọa độ để lưu bản đồ', 'error');
      return { success: false };
    }

    try {
      showToast('Đang tải bản đồ khu vực này vào bộ nhớ máy...', 'info');
      const tileUrls = generateTileUrlsForArea(centerLat, centerLng, [14, 15, 16], 1);

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PRECACHE_MAP_TILES',
          urls: tileUrls
        });
      } else if ('caches' in window) {
        const cache = await caches.open('couple-map-tiles-v2');
        for (const url of tileUrls) {
          try {
            const has = await cache.match(url);
            if (!has) {
              const res = await fetch(url, { mode: 'no-cors' });
              if (res) await cache.put(url, res);
            }
          } catch {}
        }
      }

      setTimeout(() => {
        showToast(`Đã lưu ${tileUrls.length} ảnh bản đồ! Xem thoải mái cả khi mất mạng 🗺️`, 'success');
      }, 1200);

      return { success: true, count: tileUrls.length };
    } catch (err) {
      console.warn('Precache map error:', err);
      showToast('Không thể lưu bản đồ ngoại tuyến', 'error');
      return { success: false };
    }
  }, [myLocation?.latitude, myLocation?.longitude]);

  // ─── TẢI DỮ LIỆU BAN ĐẦU & REALTIME SUBSCRIPTIONS ───
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Lắng nghe trạng thái kết nối mạng (Online/Offline)
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã có kết nối mạng trở lại 🌐', 'success');
      if (myLocationRef.current?.latitude) {
        saveLocationToDatabase(myLocationRef.current);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Đang mất mạng - Bản đồ đang chạy ở chế độ Offline ⚡', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Bắt đầu theo dõi GPS
    startWatchingLocation();

    // 3. Tải vị trí ban đầu của Tôi từ DB
    const fetchMyInitialLocation = async () => {
      if (!user?.id || !isSupabaseReady) return;
      try {
        const { data } = await supabase
          .from('couple_locations')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && isMountedRef.current) {
          setMyLocation(prev => {
            if (!prev?.latitude || prev?.is_initial_placeholder) {
              try {
                localStorage.setItem(`sc_loc_me_${user.id}`, JSON.stringify(data));
              } catch {}
              return data;
            }
            return prev;
          });
        }

        // Tải lộ trình đã lưu của Tôi từ DB
        const { data: myConfig } = await supabase
          .from('location_shares_config')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (myConfig?.share_mode && isMountedRef.current) {
          try {
            const parsedTrail = JSON.parse(myConfig.share_mode);
            if (Array.isArray(parsedTrail) && parsedTrail.length > 0) {
              setMyTrail(parsedTrail);
              try {
                localStorage.setItem(`sc_trail_me_${user.id}`, JSON.stringify(parsedTrail));
              } catch {}
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to fetch my initial location/trail from DB:', err);
      }
    };
    fetchMyInitialLocation();

    // 4. Tải vị trí & Lộ trình của Người yêu từ DB
    const fetchPartnerInitialData = async () => {
      if (!isSupabaseReady) return;
      let partnerUserId = partner?.id;
      if (!partnerUserId && couple?.id) {
        partnerUserId = couple.partner1_id === user?.id ? couple.partner2_id : couple.partner1_id;
      }
      if (!partnerUserId) return;

      try {
        const { data: locData } = await supabase
          .from('couple_locations')
          .select('*')
          .eq('user_id', partnerUserId)
          .maybeSingle();

        if (locData && isMountedRef.current) {
          setPartnerLocation(locData);
          try {
            localStorage.setItem(`sc_loc_partner_${partnerUserId}`, JSON.stringify(locData));
          } catch {}
        }

        const { data: configData } = await supabase
          .from('location_shares_config')
          .select('*')
          .eq('user_id', partnerUserId)
          .maybeSingle();

        if (configData?.share_mode && isMountedRef.current) {
          try {
            const parsedTrail = JSON.parse(configData.share_mode);
            if (Array.isArray(parsedTrail) && parsedTrail.length > 0) {
              setPartnerTrail(parsedTrail);
              try {
                localStorage.setItem(`sc_trail_partner_${partnerUserId}`, JSON.stringify(parsedTrail));
              } catch {}
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to fetch partner initial location/trail:', err);
      }
    };
    fetchPartnerInitialData();

    // 5. Tải danh sách địa điểm đã lưu
    const fetchSavedPlaces = async () => {
      if (!couple?.id || !isSupabaseReady) return;
      try {
        const { data } = await supabase
          .from('saved_places')
          .select('*')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false });

        if (data && isMountedRef.current) {
          setSavedPlaces(data);
        }
      } catch (err) {
        console.warn('Failed to fetch saved places:', err);
      }
    };
    fetchSavedPlaces();

    // 6. Thiết lập Supabase Realtime Channel
    let channel = null;
    if (couple?.id && isSupabaseReady) {
      channel = supabase.channel(`couple_live_${couple.id}`, {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'location_update' }, ({ payload }) => {
          if (payload && payload.user_id && payload.user_id !== user?.id && isMountedRef.current) {
            setPartnerLocation(payload);
            try {
              localStorage.setItem(`sc_loc_partner_${payload.user_id}`, JSON.stringify(payload));
            } catch {}

            if (payload.trail_point) {
              setPartnerTrail(prev => {
                const updated = [...prev.slice(-79), payload.trail_point];
                try {
                  localStorage.setItem(`sc_trail_partner_${payload.user_id}`, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }
        })
        .on('broadcast', { event: 'location_status_change' }, ({ payload }) => {
          if (payload && payload.user_id && payload.user_id !== user?.id && isMountedRef.current) {
            setPartnerLocation(prev => prev ? { ...prev, is_sharing: payload.is_sharing } : null);
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'couple_locations',
          filter: `couple_id=eq.${couple.id}`
        }, (payload) => {
          if (payload.new && payload.new.user_id && payload.new.user_id !== user?.id && isMountedRef.current) {
            setPartnerLocation(payload.new);
            try {
              localStorage.setItem(`sc_loc_partner_${payload.new.user_id}`, JSON.stringify(payload.new));
            } catch {}
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'saved_places',
          filter: `couple_id=eq.${couple.id}`
        }, () => {
          fetchSavedPlaces();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && isMountedRef.current) {
            setIsRealtimeConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsRealtimeConnected(false);
          }
        });

      channelRef.current = channel;
    }

    // 7. NHỊP TIM THÔNG MINH (CHỈ CHẠY KHI Ở CHẾ ĐỘ LIVE ROAD ĐỂ TIẾT KIỆM PIN)
    const smartHeartbeatTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.geolocation && isSharingEnabled) {
        if (locationModeRef.current === 'live_road') {
          navigator.geolocation.getCurrentPosition(
            (pos) => handleNewGpsPosition(pos),
            () => {},
            {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 0
            }
          );
        }
      }
    }, 15000);

    // 8. PAGE VISIBILITY: Xử lý thông minh khi tắt màn hình vs mở app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Khi mở lại màn hình: lập tức cập nhật GPS và kéo vị trí mới của người yêu
        if (navigator.geolocation && isSharingEnabled) {
          startWatchingLocation();
          navigator.geolocation.getCurrentPosition(handleNewGpsPosition, () => {}, {
            enableHighAccuracy: !isLowBattery,
            timeout: 5000,
            maximumAge: 0
          });
        }
        fetchPartnerInitialData();
      } else {
        // Khi tắt màn hình hoặc chuyển app:
        // Nếu ở chế độ Tiết kiệm pin ('battery_saver'), dừng GPS ngay để máy ngủ sâu 100%!
        if (locationModeRef.current === 'battery_saver') {
          stopWatchingLocation();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      stopWatchingLocation();
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(smartHeartbeatTimer);
      stopBackgroundKeeper();
    };
  }, [
    couple?.id, 
    partner?.id, 
    user?.id,
    isSharingEnabled
  ]);

  // ─── THAO TÁC ĐỊA ĐIỂM ĐÃ LƯU ───
  const addSavedPlace = async (name, category, lat, lon) => {
    if (!couple?.id || !user?.id) return;
    const newPlace = {
      couple_id: couple.id,
      created_by: user.id,
      name,
      category: category || 'home',
      latitude: lat,
      longitude: lon,
      radius: 150
    };

    if (isSupabaseReady) {
      const { data, error } = await supabase.from('saved_places').insert([newPlace]).select().single();
      if (data && !error) {
        setSavedPlaces(prev => [data, ...prev]);
        showToast(`Đã lưu "${name}" vào bản đồ yêu thích! 📍`, 'success');
        return data;
      }
    } else {
      const localPlace = { id: 'local-' + Date.now(), ...newPlace, created_at: new Date().toISOString() };
      setSavedPlaces(prev => [localPlace, ...prev]);
      showToast(`Đã lưu "${name}" vào bản đồ! 📍`, 'success');
      return localPlace;
    }
  };

  const deleteSavedPlace = async (placeId) => {
    setSavedPlaces(prev => prev.filter(p => p.id !== placeId));
    if (isSupabaseReady) {
      await supabase.from('saved_places').delete().eq('id', placeId);
    }
    showToast('Đã xóa địa điểm!', 'info');
  };

  // ─── GỬI TRẠNG THÁI NHANH ───
  const sendQuickStatus = async (statusText) => {
    setMyStatusMessage(statusText);
    showToast(`Đã gửi trạng thái: "${statusText}" 💕`, 'success');

    // Nếu người dùng báo "Đang trên đường về" -> Tự kích hoạt Live Road Mode
    if (statusText.includes('trên đường về')) {
      activateLiveRoad(45);
    } 
    // Nếu báo "Đã về đến nhà an toàn" -> Tự tắt Live Road Mode về Tiết kiệm pin
    else if (statusText.includes('về đến nhà')) {
      deactivateLiveRoad('Đã về đến nhà an toàn! Chuyển về Chế độ Tiết kiệm pin 🍃');
    }

    if (myLocation) {
      const updatedLoc = { ...myLocation, status_message: statusText };
      setMyLocation(updatedLoc);
      saveLocationToDatabase(updatedLoc);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'location_update',
        payload: updatedLoc
      });
    }

    if (couple?.id && user?.id && partner?.id && isSupabaseReady) {
      const notifPayload = {
        id: 'status-' + Date.now(),
        couple_id: couple.id,
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || 'Người ấy',
        receiver_id: partner.id,
        cheer_type: 'status_message',
        message: statusText,
        created_at: new Date().toISOString()
      };

      try {
        supabase.channel(`couple_notifications_${couple.id}`).send({
          type: 'broadcast',
          event: 'new_cheer',
          payload: notifPayload
        }).catch(() => {});

        supabase.from('couple_cheers').insert([{
          couple_id: couple.id,
          sender_id: user.id,
          receiver_id: partner.id,
          cheer_type: 'status_message',
          message: statusText
        }]).then(() => {});
      } catch (err) {
        console.warn('Lỗi gửi thông báo trạng thái:', err);
      }
    }
  };

  const clearMyTrail = useCallback(() => {
    setMyTrail([]);
    myTrailRef.current = [];
    try {
      localStorage.removeItem(`sc_trail_me_${user?.id}`);
    } catch {}
    saveTrailToDatabase([]);
    showToast('Đã làm mới lộ trình di chuyển hôm nay', 'info');
  }, [user?.id, saveTrailToDatabase]);

  const value = {
    myLocation,
    partnerLocation,
    isSharingEnabled,
    toggleSharing,
    distanceBetweenMeters,
    isPartnerStale,
    savedPlaces,
    addSavedPlace,
    deleteSavedPlace,
    gpsStatus,
    gpsError,
    isRealtimeConnected,
    sendQuickStatus,
    myStatusMessage,
    refreshLocation: startWatchingLocation,
    // Chế độ định vị thông minh & Tiết kiệm pin
    locationMode,
    setLocationMode,
    activateLiveRoad,
    deactivateLiveRoad,
    liveRoadRemainingMins,
    isStationary,
    isOnline,
    isLowBattery,
    downloadOfflineMapArea,
    // Lộ trình di chuyển & Thống kê hành trình
    myTrail,
    partnerTrail,
    showRouteTrail,
    setShowRouteTrail,
    clearMyTrail,
    todayStats
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
