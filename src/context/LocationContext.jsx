// context/LocationContext.jsx
// Global Background Geolocation & Route Tracker Provider
// Quản lý GPS toàn cục, chạy ngầm liên tục khi tắt màn hình (Live Road Mode), ghi nhận lộ trình di chuyển (Breadcrumbs)
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { 
  calculateDistance, 
  reverseGeocode, 
  getDeviceBatterySafe, 
  isLocationStale,
  getIpLocationFallback
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

// Hàm tạo file âm thanh tĩnh 2 giây chuẩn PCM WAV để giữ tiến trình trình duyệt chạy ngầm mượt mà như native app
function createSilentAudioUrl() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const durationSec = 2;
  const dataSize = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  // 8-bit PCM 128 = Silence
  new Uint8Array(buffer, 44, dataSize).fill(128);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

  // 5. Lộ trình di chuyển (Breadcrumbs Trail)
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

  const [showRouteTrail, setShowRouteTrail] = useState(true);

  // 6. Danh sách địa điểm đã lưu
  const [savedPlaces, setSavedPlaces] = useState([]);

  // 7. Trạng thái GPS & Realtime
  const [gpsStatus, setGpsStatus] = useState('searching'); // 'active' | 'searching' | 'denied' | 'error'
  const [gpsError, setGpsError] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [myStatusMessage, setMyStatusMessage] = useState('');

  // Refs quản lý throttles và timers
  const lastBroadcastTimeRef = useRef(0);
  const lastDbSaveTimeRef = useRef(0);
  const lastTrailSaveTimeRef = useRef(0);
  const watchIdRef = useRef(null);
  const channelRef = useRef(null);
  const isMountedRef = useRef(true);
  const myTrailRef = useRef(myTrail);
  myTrailRef.current = myTrail;

  // Background Audio Keeper Refs (giúp trình duyệt không ngắt kết nối khi tắt màn hình)
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const wakeLockRef = useRef(null);

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

  // ─── TỰ ĐỘNG CHẠY NGẦM BACKGROUND LIVE TRACKING (AUDIO KEEPER NHƯ CÁC APP LỚN) ───
  const startBackgroundKeeper = useCallback(async () => {
    try {
      // 1. Khởi tạo silent HTML5 audio loop (chạy bền bỉ trên cả Chrome Mobile và iOS Safari mà không tốn pin)
      if (!audioElementRef.current) {
        const silentUrl = createSilentAudioUrl();
        const audio = new Audio(silentUrl);
        audio.loop = true;
        audio.volume = 0.01; // Âm lượng cực nhỏ (không thể nghe thấy)
        audioElementRef.current = audio;
      }
      await audioElementRef.current.play().catch(() => {});

      // 2. Web Audio API bổ trợ cho các dòng máy Android kén background HTML5 audio
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001; // Gần như tắt tiếng
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          audioContextRef.current = ctx;
        }
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }

      // 3. Đăng ký Media Session API để giữ tiến trình và hiện thẻ phát ngầm trên màn hình khóa điện thoại
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        const pName = partner?.display_name || partner?.full_name || 'Người yêu';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Couple Live Map 💕',
          artist: `Đang tự động chia sẻ vị trí cho ${pName}`,
          album: 'Schedule Couple Live Tracking',
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

      // 4. Kích hoạt Screen Wake Lock nếu thiết bị hỗ trợ (khi đang mở màn hình)
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

  // ─── TỰ ĐỘNG KÍCH HOẠT TIẾN TRÌNH CHẠY NGẦM LIÊN TỤC (TỰ ĐỘNG 100%, KHÔNG CẦN BẬT THỦ CÔNG) ───
  useEffect(() => {
    if (!isSharingEnabled) {
      stopBackgroundKeeper();
      return;
    }

    // 1. Kích hoạt ngay lập tức
    startBackgroundKeeper();

    // 2. Kích hoạt dự phòng khi có chạm/vuốt màn hình đầu tiên (chuẩn Autoplay Policy trình duyệt)
    const handleFirstInteraction = () => {
      startBackgroundKeeper();
    };

    ['click', 'touchstart', 'pointerdown', 'scroll'].forEach(evt => {
      window.addEventListener(evt, handleFirstInteraction, { once: true, passive: true });
    });

    return () => {
      ['click', 'touchstart', 'pointerdown', 'scroll'].forEach(evt => {
        window.removeEventListener(evt, handleFirstInteraction);
      });
    };
  }, [isSharingEnabled, startBackgroundKeeper, stopBackgroundKeeper]);

  // ─── LƯU LỘ TRÌNH VÀO DB VÀ LOCALSTORAGE (THROTTLED) ───
  const saveTrailToDatabase = useCallback(async (trailPoints) => {
    if (!user?.id || !couple?.id || !isSupabaseReady) return;
    try {
      // Lưu danh sách tọa độ gần đây vào location_shares_config.share_mode dưới dạng JSON
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

  // ─── XỬ LÝ KHI NHẬN TỌA ĐỘ GPS MỚI TỪ THIẾT BỊ ───
  const handleNewGpsPosition = useCallback(async (position) => {
    if (!isMountedRef.current) return;

    const { latitude, longitude, accuracy, heading, speed, altitude } = position.coords;
    setGpsStatus('active');
    setGpsError(null);

    const battery = await getDeviceBatterySafe();
    const now = Date.now();

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

    // 1. Cập nhật vị trí của Tôi lập tức
    setMyLocation(locPayload);
    try {
      localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(locPayload));
    } catch {}

    // 2. Ghi nhận vào lộ trình di chuyển (Breadcrumbs)
    const currentTrail = myTrailRef.current;
    const lastPoint = currentTrail[currentTrail.length - 1];
    let shouldAddPoint = false;

    if (!lastPoint) {
      shouldAddPoint = true;
    } else {
      const distFromLast = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
      // Thêm điểm nếu di chuyển trên 15m hoặc đã quá 30 giây khi đang di chuyển
      if (distFromLast >= 15 || (distFromLast >= 5 && (now - lastPoint.timestamp) >= 30000)) {
        shouldAddPoint = true;
      }
    }

    let updatedTrail = currentTrail;
    const newTrailPoint = {
      lat: latitude,
      lng: longitude,
      speed: speed !== null && !isNaN(speed) ? Number(speed.toFixed(1)) : 0,
      heading: heading !== null && !isNaN(heading) ? Math.round(heading) : null,
      timestamp: now
    };

    if (shouldAddPoint) {
      updatedTrail = [...currentTrail.slice(-79), newTrailPoint];
      setMyTrail(updatedTrail);
      myTrailRef.current = updatedTrail;
      try {
        localStorage.setItem(`sc_trail_me_${user?.id}`, JSON.stringify(updatedTrail));
      } catch {}

      // Throttle lưu lộ trình vào DB (mỗi 25 giây)
      if (now - lastTrailSaveTimeRef.current >= 25000) {
        lastTrailSaveTimeRef.current = now;
        saveTrailToDatabase(updatedTrail);
      }
    }

    // 3. Tra cứu địa chỉ trong nền
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

    if (!isSharingEnabled) return;

    // 4. Broadcast trực tiếp qua WebSocket Realtime cho người yêu (Throttle 2.5s)
    if (channelRef.current && (now - lastBroadcastTimeRef.current >= 2500)) {
      lastBroadcastTimeRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: {
          ...locPayload,
          trail_point: shouldAddPoint ? newTrailPoint : null
        }
      });
    }

    // 5. Lưu vào couple_locations (Throttle 12s)
    if (now - lastDbSaveTimeRef.current >= 12000) {
      lastDbSaveTimeRef.current = now;
      saveLocationToDatabase(locPayload);
    }
  }, [isSharingEnabled, user?.id, myStatusMessage, saveLocationToDatabase, saveTrailToDatabase]);

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

  // ─── KHỞI TẠO THEO DÕI GPS LIÊN TỤC ───
  const startWatchingLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Trình duyệt không hỗ trợ Geolocation API.');
      applyFallbackLocation();
      return;
    }

    setGpsStatus('searching');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // Luôn lấy tọa độ thời gian thực mới nhất (không dùng cache)
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
  }, [handleNewGpsPosition, applyFallbackLocation]);

  // ─── TOGGLE CHIA SẺ ───
  const toggleSharing = useCallback(async (enabled) => {
    setIsSharingEnabled(enabled);
    try {
      localStorage.setItem(`sc_share_enabled_${user?.id}`, enabled ? 'true' : 'false');
    } catch {}

    if (!enabled) {
      showToast('Đã dừng chia sẻ vị trí với người yêu 🔒', 'info');
      stopBackgroundKeeper();
    } else {
      setGpsStatus('searching');
      showToast('Đã bật chia sẻ vị trí với người yêu 📍', 'success');
      startWatchingLocation();
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
  }, [user?.id, couple?.id, startWatchingLocation, stopBackgroundKeeper]);

  // ─── TẢI DỮ LIỆU BAN ĐẦU & REALTIME SUBSCRIPTIONS ───
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Luôn theo dõi GPS ở cấp toàn cục (Global)
    startWatchingLocation();

    // 2. Nhịp tim định kỳ kiểm tra GPS mỗi 8s đảm bảo vị trí luôn gửi liên tục khi di chuyển (như Life360/Google Maps)
    const heartbeatTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.geolocation && isSharingEnabled) {
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
    }, 8000);

    // 2. Tải vị trí ban đầu của Tôi từ DB
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
      } catch (err) {
        console.warn('Failed to fetch my initial location from DB:', err);
      }
    };
    fetchMyInitialLocation();

    // 3. Tải vị trí & Lộ trình của Người yêu từ DB
    const fetchPartnerInitialData = async () => {
      if (!isSupabaseReady) return;
      let partnerUserId = partner?.id;
      if (!partnerUserId && couple?.id) {
        partnerUserId = couple.partner1_id === user?.id ? couple.partner2_id : couple.partner1_id;
      }
      if (!partnerUserId) return;

      try {
        // Tải vị trí mới nhất
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

        // Tải lộ trình đã lưu của người yêu từ location_shares_config.share_mode
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

    // 4. Tải danh sách địa điểm đã lưu
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

    // 5. Thiết lập Supabase Realtime Channel
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

            // Nếu có điểm lộ trình mới đi kèm thì thêm vào partnerTrail
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

    // 6. Xử lý khi người dùng mở lại app / đánh thức màn hình (Page Visibility)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (navigator.geolocation && isSharingEnabled) {
          navigator.geolocation.getCurrentPosition(handleNewGpsPosition, () => {}, {
            enableHighAccuracy: true,
            timeout: 8000
          });
        }
        fetchPartnerInitialData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(heartbeatTimer);
      stopBackgroundKeeper();
    };
  }, [couple?.id, partner?.id, isSharingEnabled, startWatchingLocation, handleNewGpsPosition, stopBackgroundKeeper]);

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
    // Lộ trình di chuyển (Breadcrumbs)
    myTrail,
    partnerTrail,
    showRouteTrail,
    setShowRouteTrail,
    clearMyTrail
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
