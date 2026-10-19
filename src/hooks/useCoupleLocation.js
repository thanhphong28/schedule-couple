// hooks/useCoupleLocation.js
// Quản lý định vị GPS thời gian thực, đồng bộ hai chiều với đối phương qua Supabase Realtime và Broadcast
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase, isSupabaseReady } from '../lib/supabase.js';
import { 
  calculateDistance, 
  reverseGeocode, 
  getDeviceBatterySafe, 
  isLocationStale,
  getIpLocationFallback
} from '../services/geolocationService.js';
import { showToast } from '../components/shared/Toast.jsx';

export function useCoupleLocation() {
  const { user, couple, partner } = useAuth();

  // 1. Trạng thái vị trí của tôi (luôn có tọa độ để marker Tôi lập tức xuất hiện trên bản đồ)
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

  // 2. Trạng thái vị trí của người yêu (chỉ nhận từ DB Supabase hoặc Realtime, không dùng mock)
  const [partnerLocation, setPartnerLocation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`sc_loc_partner_${partner?.id}`) || 'null');
    } catch {
      return null;
    }
  });

  // Tự động dọn dẹp các cache thử nghiệm cũ (nếu có)
  useEffect(() => {
    try {
      localStorage.removeItem('sc_test_mode_location');
      if (partner?.id) {
        localStorage.removeItem(`sc_loc_partner_mock_${partner.id}`);
      }
    } catch {}
  }, [partner?.id]);

  // 3. Cài đặt chia sẻ vị trí (mặc định bật nếu người dùng chủ động cho phép)
  const [isSharingEnabled, setIsSharingEnabled] = useState(() => {
    const saved = localStorage.getItem(`sc_share_enabled_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  // 4. Danh sách địa điểm đã lưu
  const [savedPlaces, setSavedPlaces] = useState([]);

  // 5. Trạng thái GPS & Realtime
  const [gpsStatus, setGpsStatus] = useState('searching'); // 'active' | 'searching' | 'denied' | 'error' | 'disabled'
  const [gpsError, setGpsError] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [myStatusMessage, setMyStatusMessage] = useState('');

  // Refs để throttle & debounce tránh spam mạng
  const lastBroadcastTimeRef = useRef(0);
  const lastDbSaveTimeRef = useRef(0);
  const watchIdRef = useRef(null);
  const channelRef = useRef(null);
  const isMountedRef = useRef(true);

  // ─── TÍNH KHOẢNG CÁCH GIỮA HAI NGƯỜI ───
  const distanceBetweenMeters = useMemo(() => {
    if (!myLocation || !partnerLocation) return null;
    if (!partnerLocation.latitude || !partnerLocation.longitude) return null;
    // Nếu người yêu tắt chia sẻ thì không tính khoảng cách
    if (partnerLocation.is_sharing === false) return null;
    return calculateDistance(
      myLocation.latitude,
      myLocation.longitude,
      partnerLocation.latitude,
      partnerLocation.longitude
    );
  }, [myLocation, partnerLocation]);

  // Kiểm tra dữ liệu người yêu có bị cũ không (> 3 phút)
  const isPartnerStale = useMemo(() => {
    return isLocationStale(partnerLocation?.recorded_at, 180);
  }, [partnerLocation?.recorded_at]);

  // ─── LƯU CẤU HÌNH VÀO DB VÀ LOCAL STORAGE ───
  const toggleSharing = useCallback(async (enabled) => {
    setIsSharingEnabled(enabled);
    try {
      localStorage.setItem(`sc_share_enabled_${user?.id}`, enabled ? 'true' : 'false');
    } catch {}

    if (!enabled) {
      showToast('Đã dừng chia sẻ vị trí với người yêu 🔒', 'info');
    } else {
      setGpsStatus('searching');
      showToast('Đã bật chia sẻ vị trí với người yêu 📍', 'success');
      startWatchingLocation();
    }

    // Cập nhật lên Supabase nếu có
    if (user?.id && couple?.id && isSupabaseReady) {
      try {
        await supabase.from('couple_locations').upsert({
          user_id: user.id,
          couple_id: couple.id,
          is_sharing: enabled,
          updated_at: new Date().toISOString()
        });

        // Broadcast trạng thái tắt/bật cho người yêu biết ngay lập tức
        channelRef.current?.send({
          type: 'broadcast',
          event: 'location_status_change',
          payload: { user_id: user.id, is_sharing: enabled }
        });
      } catch (err) {
        console.warn('Error updating sharing status:', err);
      }
    }
  }, [user?.id, couple?.id]);

  // ─── GỬI VỊ TRÍ LÊN DATABASE (THROTTLED ĐỂ TIẾT KIỆM TÀI NGUYÊN) ───
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

    // Lấy thông tin pin thực tế nếu trình duyệt hỗ trợ
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

    // 1. Cập nhật vị trí của Tôi NGAY LẬP TỨC để vẽ marker lên bản đồ không có độ trễ
    setMyLocation(locPayload);
    try {
      localStorage.setItem(`sc_loc_me_${user?.id}`, JSON.stringify(locPayload));
    } catch {}

    // 2. Tra cứu địa chỉ chi tiết hơn trong nền (không làm nghẽn hiển thị vị trí)
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

    // Nếu người dùng đang tạm tắt chia sẻ thì chỉ hiển thị trên máy mình, không gửi cho đối phương
    if (!isSharingEnabled) return;

    // 3. Broadcast ngay lập tức qua WebSocket Realtime tới người yêu
    if (channelRef.current && (now - lastBroadcastTimeRef.current >= 3000)) {
      lastBroadcastTimeRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: locPayload
      });
    }

    // 4. Lưu vào DB (Throttle 15 giây hoặc khi vị trí thay đổi đáng kể)
    if (now - lastDbSaveTimeRef.current >= 15000) {
      lastDbSaveTimeRef.current = now;
      saveLocationToDatabase(locPayload);
    }
  }, [isSharingEnabled, user?.id, myStatusMessage, saveLocationToDatabase]);

  // ─── TỰ ĐỘNG ĐỊNH VỊ QUA IP/WIFI KHI THIẾT BỊ KHÔNG CÓ GPS (PC/LAPTOP HOẶC BỊ CHẶN) ───
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

        // Cập nhật địa chỉ chi tiết hơn trong nền
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

  // ─── KHỞI TẠO THEO DÕI GPS VỚI GEOLOCATION API ───
  const startWatchingLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Trình duyệt không hỗ trợ Geolocation API.');
      applyFallbackLocation();
      return;
    }

    setGpsStatus('searching');

    const options = {
      enableHighAccuracy: true, // Ưu tiên GPS độ chính xác cao
      timeout: 10000,           // Timeout 10s
      maximumAge: 5000          // Tối đa 5s cache
    };

    // Nếu chưa có vị trí: kích hoạt định vị ngay lập tức để người dùng luôn thấy mình trên bản đồ
    setMyLocation(current => {
      if (!current?.latitude) {
        applyFallbackLocation();
      }
      return current;
    });

    try {
      // 1. Lấy vị trí GPS ngay lập tức với getCurrentPosition (tránh watchPosition bị hoãn trên Chrome/Windows)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleNewGpsPosition(pos);
        },
        (err) => {
          console.warn('Initial getCurrentPosition check:', err);
          applyFallbackLocation();
        },
        options
      );

      // 2. Theo dõi thay đổi liên tục với watchPosition
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          handleNewGpsPosition(pos);
        },
        (error) => {
          console.warn('Geolocation watchPosition error:', error);
          applyFallbackLocation();
          if (error.code === error.PERMISSION_DENIED) {
            setGpsStatus('denied');
            setGpsError('Bạn chưa cấp quyền truy cập vị trí cho trình duyệt.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGpsStatus('error');
            setGpsError('Không thể xác định GPS thiết bị. Đang dùng định vị mạng Wi-Fi/IP.');
          } else if (error.code === error.TIMEOUT) {
            setGpsStatus('error');
            setGpsError('Hết thời gian chờ GPS. Đang dùng định vị mạng Wi-Fi/IP.');
          } else {
            setGpsStatus('error');
            setGpsError(error.message || 'Lỗi định vị.');
          }
        },
        options
      );
    } catch (err) {
      console.warn('Error starting geolocation watch:', err);
      applyFallbackLocation();
      setGpsStatus('error');
      setGpsError('Không thể kích hoạt bộ theo dõi vị trí.');
    }
  }, [handleNewGpsPosition, applyFallbackLocation]);

  // ─── TẢI DỮ LIỆU BAN ĐẦU & THIẾT LẬP SUPABASE REALTIME ───
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Bắt đầu lắng nghe GPS của tôi
    startWatchingLocation();

    // 2. Tải vị trí của chính tôi từ Supabase nếu có
    const fetchMyInitialLocation = async () => {
      if (!user?.id || !isSupabaseReady) return;
      try {
        const { data, error } = await supabase
          .from('couple_locations')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && !error && isMountedRef.current) {
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

    // 3. Tải vị trí ban đầu của người yêu từ Supabase (chỉ lấy dữ liệu thật)
    const fetchPartnerInitialLocation = async () => {
      if (!partner?.id || !isSupabaseReady) return;
      try {
        const { data, error } = await supabase
          .from('couple_locations')
          .select('*')
          .eq('user_id', partner.id)
          .maybeSingle();

        if (data && !error && isMountedRef.current) {
          setPartnerLocation(data);
          try {
            localStorage.setItem(`sc_loc_partner_${partner.id}`, JSON.stringify(data));
          } catch {}
        } else if (isMountedRef.current) {
          // Chưa có dữ liệu trong DB: giữ nguyên null để phản ánh đúng thực tế
          setPartnerLocation(null);
        }
      } catch (err) {
        console.warn('Failed to fetch initial partner location:', err);
      }
    };

    fetchPartnerInitialLocation();

    // 3. Tải danh sách địa điểm đã lưu (Saved Places)
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

    // 4. Thiết lập Realtime Channel cho cặp đôi
    let channel = null;
    if (couple?.id && isSupabaseReady) {
      channel = supabase.channel(`couple_live_${couple.id}`, {
        config: {
          broadcast: { self: false } // Không nhận lại broadcast của chính mình
        }
      });

      // Lắng nghe cập nhật GPS tức thì từ người yêu
      channel
        .on('broadcast', { event: 'location_update' }, ({ payload }) => {
          if (payload && payload.user_id === partner?.id && isMountedRef.current) {
            setPartnerLocation(payload);
            try {
              localStorage.setItem(`sc_loc_partner_${partner.id}`, JSON.stringify(payload));
            } catch {}
          }
        })
        .on('broadcast', { event: 'location_status_change' }, ({ payload }) => {
          if (payload && payload.user_id === partner?.id && isMountedRef.current) {
            setPartnerLocation(prev => prev ? { ...prev, is_sharing: payload.is_sharing } : null);
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'couple_locations',
          filter: `couple_id=eq.${couple.id}`
        }, (payload) => {
          if (payload.new && payload.new.user_id === partner?.id && isMountedRef.current) {
            setPartnerLocation(payload.new);
            try {
              localStorage.setItem(`sc_loc_partner_${partner.id}`, JSON.stringify(payload.new));
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

    // 5. Xử lý Page Visibility API (khi mở lại app sau khi tắt màn hình)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Làm mới GPS ngay lập tức
        if (navigator.geolocation && isSharingEnabled) {
          navigator.geolocation.getCurrentPosition(handleNewGpsPosition, () => {}, {
            enableHighAccuracy: true,
            timeout: 8000
          });
        }
        fetchPartnerInitialLocation();
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
    };
  }, [couple?.id, partner?.id, isSharingEnabled, startWatchingLocation, handleNewGpsPosition]);

  // ─── THAO TÁC THÊM & XÓA ĐỊA ĐIỂM YÊU THÍCH ───
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

  // ─── GỬI TRẠNG THÁI NHANH CHO NGƯỜI YÊU (AN TOÀN / GẮN KẾT) ───
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
  };

  return {
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
    refreshLocation: startWatchingLocation
  };
}
