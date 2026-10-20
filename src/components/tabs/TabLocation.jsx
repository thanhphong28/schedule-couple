// components/tabs/TabLocation.jsx
// Tab Vị Trí Cặp Đôi (Couple Live Map)
// Bản đồ thời gian thực hiển thị vị trí hai người yêu, lộ trình di chuyển trực tiếp (như Messenger), khoảng cách, tốc độ, địa chỉ và chế độ đi đường chạy ngầm
import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation } from '../../context/LocationContext.jsx';
import { 
  formatDistance, 
  formatSpeed, 
  formatTimeAgo,
  calculateDistance,
  getGoogleMapsDirectionsUrl
} from '../../services/geolocationService.js';
import { 
  Navigation, Heart, MapPin, Shield, Layers, 
  Send, Battery, BatteryCharging, AlertTriangle, 
  X, Plus, Trash2, ExternalLink, ChevronUp,
  Radio, Download, BatteryLow, 
  WifiOff, Zap
} from 'lucide-react';
import { showToast } from '../shared/Toast.jsx';

// Cấu hình Tile Providers Google Maps & Vệ tinh siêu nét (Tiếng Việt đầy đủ, KHÔNG watermark, KHÔNG cần API key)
const TILE_PROVIDERS = {
  hybrid: {
    id: 'hybrid',
    name: 'Vệ Tinh Google 🛰️',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    className: ''
  },
  dark: {
    id: 'dark',
    name: 'Bản Đồ Đêm 🌙',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    className: 'google-dark-tiles'
  },
  roadmap: {
    id: 'roadmap',
    name: 'Đường Phố Google 🗺️',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    className: ''
  }
};

export default function TabLocation() {
  const { user, partner } = useAuth();
  const {
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
    isRealtimeConnected,
    sendQuickStatus,
    refreshLocation,
    partnerTrail,
    myTrail,
    showRouteTrail,
    setShowRouteTrail,
    locationMode,
    setLocationMode,
    activateLiveRoad,
    deactivateLiveRoad,
    liveRoadRemainingMins,
    isStationary,
    isOnline,
    isLowBattery,
    downloadOfflineMapArea,
    todayStats
  } = useLocation();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const myMarkerRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const coupleTogetherMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const polylineRef = useRef(null);
  const polylineGlowRef = useRef(null);
  const distanceBadgeMarkerRef = useRef(null);
  const placesLayerRef = useRef(null);
  const partnerTrailLayerRef = useRef(null);
  const trailStartMarkerRef = useRef(null);

  // Chế độ bản đồ: 'hybrid' (Vệ tinh Google) | 'dark' (Bản đồ đêm) | 'roadmap' (Đường phố)
  const [mapStyle, setMapStyle] = useState('hybrid');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlacesModal, setShowPlacesModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('home');
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const partnerName = partner?.display_name || partner?.full_name || 'Người yêu';
  const myName = user?.display_name || user?.full_name || 'Tôi';

  // Khoảng cách thực tế giữa hai người (ưu tiên context, nếu context chưa kịp tính thì tính trực tiếp từ tọa độ)
  const actualDistanceMeters = useMemo(() => {
    if (distanceBetweenMeters !== null && distanceBetweenMeters !== undefined) {
      return distanceBetweenMeters;
    }
    if (myLocation?.latitude && partnerLocation?.latitude && partnerLocation?.is_sharing !== false) {
      return calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
    }
    return null;
  }, [distanceBetweenMeters, myLocation?.latitude, myLocation?.longitude, partnerLocation?.latitude, partnerLocation?.longitude, partnerLocation?.is_sharing]);

  // Tự động nhận diện khi hai bạn đang ở bên cạnh nhau (< 80 mét)
  const isTogether = actualDistanceMeters !== null && actualDistanceMeters < 80;

  // Khi đang ở cạnh nhau: Tự động dùng chung địa chỉ chính xác nhất đã giải mã
  const displayAddress = useMemo(() => {
    const myAddr = myLocation?.address_name;
    const partnerAddr = partnerLocation?.address_name;
    const isValid = (addr) => addr && 
      !addr.startsWith('Đang định vị') && 
      !addr.startsWith('Đang xác') && 
      !addr.startsWith('Chưa có') &&
      !/^\s*\d+\.\d+,\s*\d+\.\d+\s*$/.test(addr);

    if (isTogether) {
      if (isValid(partnerAddr)) return partnerAddr;
      if (isValid(myAddr)) return myAddr;
      if (partnerAddr && !/^\s*\d+\.\d+,\s*\d+\.\d+\s*$/.test(partnerAddr)) return partnerAddr;
      if (myAddr && !/^\s*\d+\.\d+,\s*\d+\.\d+\s*$/.test(myAddr)) return myAddr;
      return 'Cùng một địa điểm 💕';
    }
    return partnerAddr || 'Đang chờ cập nhật địa chỉ...';
  }, [isTogether, myLocation?.address_name, partnerLocation?.address_name]);

  const hasFittedBothRef = useRef(false);
  const hasFittedMyLocRef = useRef(false);

  // ─── 1. KHỞI TẠO BẢN ĐỒ LEAFLET ───
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultLat = myLocation?.latitude || partnerLocation?.latitude || 10.7960;
    const defaultLng = myLocation?.longitude || partnerLocation?.longitude || 106.6840;

    // Khởi tạo bản đồ 2D siêu mượt (Tắt touchRotate để loại bỏ hoàn toàn lỗi xén góc tam giác trắng khi pinch-to-zoom)
    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 2000,
      easeLinearity: 0.2,
      touchZoom: true,
      bounceAtZoomLimits: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    });

    const activeConfig = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.hybrid;
    const tiles = L.tileLayer(activeConfig.url, {
      maxZoom: activeConfig.maxZoom,
      subdomains: activeConfig.subdomains,
      className: activeConfig.className || ''
    }).addTo(map);

    // Layer nhóm cho các địa điểm đã lưu & Lộ trình di chuyển
    const placesLayer = L.layerGroup().addTo(map);
    placesLayerRef.current = placesLayer;

    const trailLayer = L.layerGroup().addTo(map);
    partnerTrailLayerRef.current = trailLayer;

    mapInstanceRef.current = map;
    mapInstanceRef.current._tileLayer = tiles;
    setMapReady(true);

    // Gắn ResizeObserver để tự động map.invalidateSize() bất cứ khi nào layout thay đổi
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
      try {
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
      myMarkerRef.current = null;
      partnerMarkerRef.current = null;
      accuracyCircleRef.current = null;
      polylineRef.current = null;
      polylineGlowRef.current = null;
      distanceBadgeMarkerRef.current = null;
      coupleTogetherMarkerRef.current = null;
      placesLayerRef.current = null;
      partnerTrailLayerRef.current = null;
      trailStartMarkerRef.current = null;
      hasFittedBothRef.current = false;
      hasFittedMyLocRef.current = false;
      setMapReady(false);
    };
  }, []);

  // ─── ĐỔI GIAO DIỆN TILE KHI CHỌN MAP STYLE ───
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._tileLayer) return;
    mapInstanceRef.current.removeLayer(mapInstanceRef.current._tileLayer);

    const activeConfig = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.hybrid;
    const newTiles = L.tileLayer(activeConfig.url, {
      maxZoom: activeConfig.maxZoom,
      subdomains: activeConfig.subdomains,
      className: activeConfig.className || ''
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current._tileLayer = newTiles;
  }, [mapStyle]);

  const cycleMapStyle = () => {
    setMapStyle(prev => {
      let next = 'hybrid';
      if (prev === 'hybrid') next = 'dark';
      else if (prev === 'dark') next = 'roadmap';
      else next = 'hybrid';
      const provider = TILE_PROVIDERS[next];
      showToast(`Đã chuyển sang ${provider.name}`, 'info');
      return next;
    });
  };

  // Helper hàm di chuyển tâm camera tính đến Bottom Sheet
  const flyToOffset = (map, lat, lng, zoom = 16, offsetY = 80) => {
    if (!map || !lat || !lng) return;
    try {
      const targetPoint = map.project([lat, lng], zoom);
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + offsetY);
      const offsetLatLng = map.unproject(offsetPoint, zoom);
      map.flyTo(offsetLatLng, zoom, { duration: 1.2 });
    } catch {
      map.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  // ─── SMART CAMERA ACTIONS ───
  const fitBothInView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation?.is_sharing !== false;

    if (hasMyLoc && hasPartnerLoc) {
      if (isTogether) {
        const midLat = (myLocation.latitude + partnerLocation.latitude) / 2;
        const midLng = (myLocation.longitude + partnerLocation.longitude) / 2;
        flyToOffset(map, midLat, midLng, 17, 80);
        coupleTogetherMarkerRef.current?.openPopup();
        showToast('Hai bạn đang ở bên cạnh nhau rất hạnh phúc! 💑💖', 'success');
      } else {
        map.fitBounds([
          [myLocation.latitude, myLocation.longitude],
          [partnerLocation.latitude, partnerLocation.longitude]
        ], {
          paddingTopLeft: [50, 90],
          paddingBottomRight: [70, 300],
          maxZoom: 16
        });
      }
    } else if (hasMyLoc) {
      flyToOffset(map, myLocation.latitude, myLocation.longitude, 16, 80);
    } else if (hasPartnerLoc) {
      flyToOffset(map, partnerLocation.latitude, partnerLocation.longitude, 16, 80);
    }
  };

  const focusPartner = () => {
    if (mapInstanceRef.current && partnerLocation?.latitude) {
      if (isTogether && myLocation?.latitude) {
        const midLat = (myLocation.latitude + partnerLocation.latitude) / 2;
        const midLng = (myLocation.longitude + partnerLocation.longitude) / 2;
        flyToOffset(mapInstanceRef.current, midLat, midLng, 17, 80);
        coupleTogetherMarkerRef.current?.openPopup();
      } else {
        flyToOffset(mapInstanceRef.current, partnerLocation.latitude, partnerLocation.longitude, 16, 80);
        if (partnerMarkerRef.current) {
          partnerMarkerRef.current.openPopup();
        }
      }
    }
  };

  const focusMe = () => {
    if (mapInstanceRef.current && myLocation?.latitude) {
      if (isTogether && partnerLocation?.latitude) {
        const midLat = (myLocation.latitude + partnerLocation.latitude) / 2;
        const midLng = (myLocation.longitude + partnerLocation.longitude) / 2;
        flyToOffset(mapInstanceRef.current, midLat, midLng, 17, 80);
        coupleTogetherMarkerRef.current?.openPopup();
      } else {
        flyToOffset(mapInstanceRef.current, myLocation.latitude, myLocation.longitude, 16, 80);
        if (myMarkerRef.current) {
          myMarkerRef.current.openPopup();
        }
      }
    } else {
      refreshLocation();
    }
  };

  // ─── TỰ ĐỘNG CĂN CHỈNH CAMERA BAN ĐẦU ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation.is_sharing !== false;

    if (hasMyLoc && hasPartnerLoc) {
      if (!hasFittedBothRef.current) {
        if (isTogether) {
          const midLat = (myLocation.latitude + partnerLocation.latitude) / 2;
          const midLng = (myLocation.longitude + partnerLocation.longitude) / 2;
          flyToOffset(map, midLat, midLng, 17, 80);
        } else {
          map.fitBounds([
            [myLocation.latitude, myLocation.longitude],
            [partnerLocation.latitude, partnerLocation.longitude]
          ], {
            paddingTopLeft: [50, 90],
            paddingBottomRight: [70, 300],
            maxZoom: 16
          });
        }
        hasFittedBothRef.current = true;
      }
    } else if (hasMyLoc && !hasPartnerLoc) {
      if (!hasFittedMyLocRef.current || !myLocation?.is_initial_placeholder) {
        flyToOffset(map, myLocation.latitude, myLocation.longitude, 16, 80);
        if (!myLocation?.is_initial_placeholder) {
          hasFittedMyLocRef.current = true;
        }
      }
    }
  }, [myLocation, partnerLocation, mapReady, isTogether]);

  // ─── 2. VẼ / CẬP NHẬT MARKER CỦA TÔI (MY LOCATION) VỚI CON TRỎ HƯỚNG DI CHUYỂN ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isTogether || !myLocation?.latitude || !myLocation?.longitude) {
      if (myMarkerRef.current) {
        try { map.removeLayer(myMarkerRef.current); } catch {}
        myMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        try { map.removeLayer(accuracyCircleRef.current); } catch {}
        accuracyCircleRef.current = null;
      }
      return;
    }

    const { latitude, longitude, accuracy, heading, speed } = myLocation;
    const avatar = user?.avatar_url;
    const isMoving = speed && speed > 1;

    // Marker với viền phát sáng cyan và mũi tên chỉ hướng di chuyển thật (Heading Cone)
    const myHtml = `
      <div class="relative flex items-center justify-center" style="width: 52px; height: 52px;">
        <!-- Vòng sóng radar lan tỏa phát sáng -->
        <div class="absolute -inset-2 rounded-full bg-sky-400/30 ${isMoving ? 'animate-ping' : ''} pointer-events-none"></div>

        <!-- Mũi tên chỉ hướng di chuyển GPS (Google Maps style heading cone) -->
        ${heading !== null && heading !== undefined ? `
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="transform: rotate(${heading}deg);">
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #38bdf8; position: absolute; top: -8px; filter: drop-shadow(0 0 6px #38bdf8);"></div>
          </div>
        ` : ''}

        <div class="relative rounded-full shadow-[0_0_24px_rgba(56,189,248,0.85)] bg-zinc-950 overflow-hidden flex items-center justify-center" style="width: 46px; height: 46px; border: 3px solid #38bdf8;">
          ${avatar 
            ? `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${myName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=0284c7&color=fff';"/>`
            : `<div class="w-full h-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-base">${myName.charAt(0).toUpperCase()}</div>`
          }
        </div>

        <!-- Badge định danh Tôi rõ ràng -->
        <div class="absolute -bottom-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/40 flex items-center gap-0.5 whitespace-nowrap pointer-events-none" style="font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>💙</span><span>${myName} (Tôi)</span>
        </div>
      </div>
    `;

    const myIcon = L.divIcon({
      className: 'custom-my-location-marker',
      html: myHtml,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });

    if (!myMarkerRef.current || !map.hasLayer(myMarkerRef.current)) {
      if (myMarkerRef.current) {
        try { map.removeLayer(myMarkerRef.current); } catch {}
      }
      myMarkerRef.current = L.marker([latitude, longitude], { icon: myIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      myMarkerRef.current.setLatLng([latitude, longitude]);
      myMarkerRef.current.setIcon(myIcon);
    }

    const shortMyAddress = myLocation?.address_name ? myLocation.address_name.split(',').slice(0, 2).join(',') : 'Vị trí hiện tại của bạn';
    const myPopupContent = `
      <div style="font-family: inherit; min-width: 155px; text-align: center; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; font-weight: 800; font-size: 13px; color: #38bdf8; margin-bottom: 2px;">
          <span>📍</span>
          <span>${myName} (Bạn)</span>
        </div>
        <div style="font-size: 11px; color: #a1a1aa; line-height: 1.3;">
          ${shortMyAddress}
        </div>
        ${speed && speed > 1 ? `<div style="margin-top: 4px; font-size: 10px; font-weight: 800; color: #38bdf8;">${formatSpeed(speed)}</div>` : ''}
      </div>
    `;

    myMarkerRef.current.unbindPopup();
    myMarkerRef.current.bindPopup(myPopupContent, {
      className: 'custom-romantic-popup',
      offset: [0, -22],
      closeButton: false
    });

    myMarkerRef.current.off('click');
    myMarkerRef.current.on('click', () => {
      focusMe();
      myMarkerRef.current?.openPopup();
    });

    if (accuracy && accuracy < 200) {
      if (!accuracyCircleRef.current || !map.hasLayer(accuracyCircleRef.current)) {
        if (accuracyCircleRef.current) {
          try { map.removeLayer(accuracyCircleRef.current); } catch {}
        }
        accuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.08,
          weight: 1
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    }
  }, [myLocation, user, mapReady, isTogether, myName]);

  // ─── 3. VẼ / CẬP NHẬT MARKER CỦA NGƯỜI YÊU (PARTNER LOCATION) VỚI SPEED & HEADING ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isTogether || !partnerLocation?.latitude || !partnerLocation?.longitude || partnerLocation.is_sharing === false) {
      if (partnerMarkerRef.current) {
        try { map.removeLayer(partnerMarkerRef.current); } catch {}
        partnerMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude, status_message, speed, heading } = partnerLocation;
    const avatar = partner?.avatar_url;
    const isMoving = speed && speed > 1;

    const partnerHtml = `
      <div class="relative flex items-center justify-center" style="width: 52px; height: 52px;">
        <!-- Bong bóng lời nhắn nếu có -->
        ${status_message ? `
          <div class="absolute -top-8 bg-zinc-950/95 backdrop-blur-md border border-rose-500/50 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap animate-bounce flex items-center gap-1">
            <span>💬</span><span>${status_message}</span>
          </div>
        ` : ''}

        <!-- Radar phát sáng hồng -->
        <div class="absolute -inset-2.5 rounded-full bg-rose-500/30 ${isMoving ? 'animate-ping' : ''} pointer-events-none"></div>

        <!-- Mũi tên chỉ hướng di chuyển GPS của người yêu -->
        ${heading !== null && heading !== undefined ? `
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="transform: rotate(${heading}deg);">
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #f43f5e; position: absolute; top: -8px; filter: drop-shadow(0 0 6px #f43f5e);"></div>
          </div>
        ` : ''}

        <div class="relative rounded-full shadow-[0_0_24px_rgba(244,63,94,0.8)] bg-zinc-950 overflow-hidden flex items-center justify-center" style="width: 46px; height: 46px; border: 3px solid #f43f5e;">
          ${avatar 
            ? `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${partnerName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=f43f5e&color=fff';"/>`
            : `<div class="w-full h-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center font-black text-white text-base">${partnerName.charAt(0).toUpperCase()}</div>`
          }
        </div>

        <!-- Badge định danh & Tốc độ khi đang di chuyển -->
        <div class="absolute -bottom-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white/40 flex items-center gap-1 whitespace-nowrap pointer-events-none" style="font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <span>❤️</span>
          <span>${partnerName}</span>
          ${isMoving ? `<span class="bg-black/30 px-1 rounded text-[8px] font-bold">${formatSpeed(speed).replace('Đang trên xe (~', '').replace(')', '')}</span>` : ''}
        </div>
      </div>
    `;

    const partnerIcon = L.divIcon({
      className: 'custom-partner-location-marker',
      html: partnerHtml,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });

    if (!partnerMarkerRef.current || !map.hasLayer(partnerMarkerRef.current)) {
      if (partnerMarkerRef.current) {
        try { map.removeLayer(partnerMarkerRef.current); } catch {}
      }
      partnerMarkerRef.current = L.marker([latitude, longitude], { icon: partnerIcon, zIndexOffset: 999 }).addTo(map);
    } else {
      partnerMarkerRef.current.setLatLng([latitude, longitude]);
      partnerMarkerRef.current.setIcon(partnerIcon);
    }

    const directionsUrl = getGoogleMapsDirectionsUrl(latitude, longitude);
    const shortPartnerAddress = partnerLocation?.address_name ? partnerLocation.address_name.split(',').slice(0, 2).join(',') : 'Vị trí hiện tại';
    const partnerPopupContent = `
      <div style="font-family: inherit; min-width: 180px; text-align: center; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 800; font-size: 13px; color: #f43f5e; margin-bottom: 2px;">
          <span>❤️</span>
          <span>${partnerName}</span>
        </div>
        <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 6px; line-height: 1.3;">
          ${shortPartnerAddress}
        </div>
        ${speed && speed > 1 ? `<div style="font-size: 11px; font-weight: 800; color: #fb7185; margin-bottom: 6px;">${formatSpeed(speed)}</div>` : ''}
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          background: linear-gradient(135deg, #2563eb, #0284c7);
          color: white;
          font-size: 11px;
          font-weight: 800;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(37,99,235,0.4);
        ">
          <span>🚗 Chỉ đường Google Maps</span>
        </a>
      </div>
    `;

    partnerMarkerRef.current.unbindPopup();
    partnerMarkerRef.current.bindPopup(partnerPopupContent, {
      className: 'custom-romantic-popup',
      offset: [0, -22],
      closeButton: false
    });

    partnerMarkerRef.current.off('click');
    partnerMarkerRef.current.on('click', () => {
      focusPartner();
      setSheetCollapsed(false);
      partnerMarkerRef.current?.openPopup();
    });
  }, [partnerLocation, partner, mapReady, isTogether, partnerName]);

  // ─── 4. VẼ LỘ TRÌNH DI CHUYỂN TRỰC TIẾP (BREADCRUMB ROUTE TRAIL - NHƯ MESSENGER) ───
  useEffect(() => {
    const trailLayer = partnerTrailLayerRef.current;
    if (!trailLayer) return;

    trailLayer.clearLayers();

    if (!showRouteTrail) return;

    // 1. Vẽ lộ trình của người yêu (Partner Trail)
    if (partnerTrail && partnerTrail.length >= 2) {
      const latlngs = partnerTrail.map(p => [p.lat, p.lng]);

      // Hào quang phát sáng bên ngoài
      L.polyline(latlngs, {
        color: '#f43f5e',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(trailLayer);

      // Đường chính sắc nét
      L.polyline(latlngs, {
        color: '#fda4af',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(trailLayer);

      // Điểm bắt đầu xuất phát (Start Pin 🟢)
      const startPoint = partnerTrail[0];
      const startHtml = `
        <div class="flex items-center justify-center" style="width: 24px; height: 24px;">
          <div class="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-black">
            A
          </div>
        </div>
      `;
      const startIcon = L.divIcon({
        className: 'custom-trail-start-marker',
        html: startHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const startMarker = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon }).addTo(trailLayer);
      startMarker.bindPopup(`
        <div style="font-size: 11px; text-align: center; color: #fff; padding: 2px;">
          <strong style="color: #34d399;">Điểm xuất phát</strong><br/>
          <span style="color: #a1a1aa; font-size: 10px;">${formatTimeAgo(startPoint.timestamp)}</span>
        </div>
      `, { className: 'custom-romantic-popup', offset: [0, -12], closeButton: false });
    }

    // 2. Vẽ lộ trình của chính tôi (My Trail) bằng vệt xanh cyan
    if (myTrail && myTrail.length >= 2) {
      const myLatlngs = myTrail.map(p => [p.lat, p.lng]);
      L.polyline(myLatlngs, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(trailLayer);
    }
  }, [partnerTrail, myTrail, showRouteTrail, mapReady]);

  // ─── 5. ĐƯỜNG KẾT NỐI TÌNH YÊU & HUY HIỆU KHOẢNG CÁCH GIỮA 2 NGƯỜI ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation.is_sharing !== false;

    if (hasMyLoc && hasPartnerLoc) {
      const midLat = (myLocation.latitude + partnerLocation.latitude) / 2;
      const midLng = (myLocation.longitude + partnerLocation.longitude) / 2;
      const distFormatted = formatDistance(actualDistanceMeters);

      if (isTogether) {
        // Khi ở cạnh nhau (< 80m): Ẩn polyline thô và distance badge riêng lẻ
        if (polylineGlowRef.current) {
          try { map.removeLayer(polylineGlowRef.current); } catch {}
          polylineGlowRef.current = null;
        }
        if (polylineRef.current) {
          try { map.removeLayer(polylineRef.current); } catch {}
          polylineRef.current = null;
        }
        if (distanceBadgeMarkerRef.current) {
          try { map.removeLayer(distanceBadgeMarkerRef.current); } catch {}
          distanceBadgeMarkerRef.current = null;
        }

        // Tạo / cập nhật Couple Together Marker biểu tượng cặp đôi bên nhau
        const myAvatar = user?.avatar_url;
        const partnerAvatar = partner?.avatar_url;
        const maxSpeed = Math.max(myLocation?.speed || 0, partnerLocation?.speed || 0);
        const isMovingTogether = maxSpeed > 1;

        const coupleHtml = `
          <div class="relative flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all select-none" style="width: 120px; height: 64px;">
            <!-- Vòng hào quang phát sáng lan tỏa tình yêu -->
            <div class="absolute -inset-2 rounded-full bg-gradient-to-r from-sky-400/30 via-rose-500/40 to-pink-500/30 blur-md ${isMovingTogether ? 'animate-pulse' : ''} pointer-events-none"></div>

            <!-- Cặp đôi bên nhau: 2 Avatar lồng nhau ngọt ngào -->
            <div class="relative flex items-center justify-center pointer-events-auto">
              <!-- Avatar Tôi (Bên Trái - Viền Xanh Cyan) -->
              <div class="relative rounded-full shadow-[0_0_16px_rgba(56,189,248,0.85)] bg-zinc-950 overflow-hidden flex items-center justify-center -mr-2.5 z-10" style="width: 44px; height: 44px; border: 3px solid #38bdf8;">
                ${myAvatar 
                  ? `<img src="${myAvatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${myName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=0284c7&color=fff';"/>`
                  : `<div class="w-full h-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-sm">${myName.charAt(0).toUpperCase()}</div>`
                }
                <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-sky-500 border border-zinc-950 flex items-center justify-center text-[7px] text-white font-black">💙</div>
              </div>

              <!-- Trái tim phát sáng ở giữa nối kết 2 người -->
              <div class="relative z-30 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white shadow-xl flex items-center justify-center text-xs animate-bounce pointer-events-none" style="width: 26px; height: 26px;">
                💖
              </div>

              <!-- Avatar Người Yêu (Bên Phải - Viền Hồng Rose) -->
              <div class="relative rounded-full shadow-[0_0_16px_rgba(244,63,94,0.85)] bg-zinc-950 overflow-hidden flex items-center justify-center -ml-2.5 z-20" style="width: 44px; height: 44px; border: 3px solid #f43f5e;">
                ${partnerAvatar 
                  ? `<img src="${partnerAvatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${partnerName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=f43f5e&color=fff';"/>`
                  : `<div class="w-full h-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center font-black text-white text-sm">${partnerName.charAt(0).toUpperCase()}</div>`
                }
                <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-rose-500 border border-zinc-950 flex items-center justify-center text-[7px] text-white font-black">❤️</div>
              </div>
            </div>

            <!-- Huy hiệu: Đang ở bên cạnh nhau -->
            <div class="relative -mt-1.5 z-40 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-[0_4px_16px_rgba(244,63,94,0.6)] border border-white/50 flex items-center gap-1 whitespace-nowrap" style="font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <span>👩‍❤️‍👨</span>
              <span>${isMovingTogether ? 'Đang cùng di chuyển' : 'Đang ở bên nhau 💕'}</span>
            </div>
          </div>
        `;

        const coupleIcon = L.divIcon({
          className: 'custom-couple-together-marker-icon',
          html: coupleHtml,
          iconSize: [120, 64],
          iconAnchor: [60, 32]
        });

        if (!coupleTogetherMarkerRef.current || !map.hasLayer(coupleTogetherMarkerRef.current)) {
          if (coupleTogetherMarkerRef.current) {
            try { map.removeLayer(coupleTogetherMarkerRef.current); } catch {}
          }
          coupleTogetherMarkerRef.current = L.marker([midLat, midLng], {
            icon: coupleIcon,
            zIndexOffset: 1200
          }).addTo(map);
        } else {
          coupleTogetherMarkerRef.current.setLatLng([midLat, midLng]);
          coupleTogetherMarkerRef.current.setIcon(coupleIcon);
        }

        const couplePopupContent = `
          <div style="font-family: inherit; min-width: 195px; text-align: center; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: 900; font-size: 13px; color: #fb7185; margin-bottom: 3px;">
              <span>💑</span>
              <span>Hai bạn đang ở bên cạnh nhau! 💕</span>
            </div>
            <div style="font-size: 11px; color: #e4e4e7; line-height: 1.35; margin-bottom: 6px;">
              📍 ${displayAddress}
            </div>
            <div style="font-size: 10px; color: #a1a1aa; background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 8px;">
              ${actualDistanceMeters !== null && actualDistanceMeters < 30 ? 'Khoảng cách siêu gần (< 30m)' : `Khoảng cách: ~${actualDistanceMeters}m`} · Hẹn hò vui vẻ 🥰
            </div>
          </div>
        `;

        coupleTogetherMarkerRef.current.unbindPopup();
        coupleTogetherMarkerRef.current.bindPopup(couplePopupContent, {
          className: 'custom-romantic-popup',
          offset: [0, -26],
          closeButton: false
        });

        coupleTogetherMarkerRef.current.off('click');
        coupleTogetherMarkerRef.current.on('click', () => {
          flyToOffset(map, midLat, midLng, 17, 80);
          setSheetCollapsed(false);
          coupleTogetherMarkerRef.current?.openPopup();
        });

      } else {
        // Khi ở xa (> 80m): Xóa Couple Together Marker
        if (coupleTogetherMarkerRef.current) {
          try { map.removeLayer(coupleTogetherMarkerRef.current); } catch {}
          coupleTogetherMarkerRef.current = null;
        }

        // Vẽ vệt sáng và đường nối giữa hai người
        const latlngs = [
          [myLocation.latitude, myLocation.longitude],
          [partnerLocation.latitude, partnerLocation.longitude]
        ];

        if (!polylineGlowRef.current || !map.hasLayer(polylineGlowRef.current)) {
          if (polylineGlowRef.current) {
            try { map.removeLayer(polylineGlowRef.current); } catch {}
          }
          polylineGlowRef.current = L.polyline(latlngs, {
            color: '#f43f5e',
            weight: 7,
            opacity: 0.3,
            lineCap: 'round'
          }).addTo(map);
        } else {
          polylineGlowRef.current.setLatLngs(latlngs);
        }

        if (!polylineRef.current || !map.hasLayer(polylineRef.current)) {
          if (polylineRef.current) {
            try { map.removeLayer(polylineRef.current); } catch {}
          }
          polylineRef.current = L.polyline(latlngs, {
            color: '#fda4af',
            weight: 3,
            opacity: 0.9,
            dashArray: '10, 8',
            lineCap: 'round'
          }).addTo(map);
        } else {
          polylineRef.current.setLatLngs(latlngs);
        }

        // Huy hiệu khoảng cách ở giữa
        const badgeHtml = `
          <div class="couple-bridge-label-wrap pointer-events-auto cursor-pointer" style="display: flex; align-items: center; justify-content: center;">
            <div class="couple-bridge-label px-3 py-1.5 rounded-full bg-zinc-950/95 backdrop-blur-md border border-rose-500/70 shadow-[0_4px_25px_rgba(244,63,94,0.6)] text-white text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all hover:scale-105">
              <span class="animate-pulse">💕</span>
              <span>Cách nhau <strong style="color: #fb7185; font-size: 12px; margin-left: 2px;">${distFormatted}</strong></span>
            </div>
          </div>
        `;

        const badgeIcon = L.divIcon({
          className: 'custom-couple-distance-badge-icon',
          html: badgeHtml,
          iconSize: [160, 32],
          iconAnchor: [80, 16]
        });

        if (!distanceBadgeMarkerRef.current || !map.hasLayer(distanceBadgeMarkerRef.current)) {
          if (distanceBadgeMarkerRef.current) {
            try { map.removeLayer(distanceBadgeMarkerRef.current); } catch {}
          }
          distanceBadgeMarkerRef.current = L.marker([midLat, midLng], {
            icon: badgeIcon,
            zIndexOffset: 1500
          }).addTo(map);
        } else {
          distanceBadgeMarkerRef.current.setLatLng([midLat, midLng]);
          distanceBadgeMarkerRef.current.setIcon(badgeIcon);
        }

        distanceBadgeMarkerRef.current.off('click');
        distanceBadgeMarkerRef.current.on('click', () => {
          fitBothInView();
          showToast(`Hai bạn đang cách nhau ${distFormatted} 💕`, 'info');
        });
      }
    } else {
      if (coupleTogetherMarkerRef.current) {
        try { map.removeLayer(coupleTogetherMarkerRef.current); } catch {}
        coupleTogetherMarkerRef.current = null;
      }
      if (polylineGlowRef.current) {
        try { map.removeLayer(polylineGlowRef.current); } catch {}
        polylineGlowRef.current = null;
      }
      if (polylineRef.current) {
        try { map.removeLayer(polylineRef.current); } catch {}
        polylineRef.current = null;
      }
      if (distanceBadgeMarkerRef.current) {
        try { map.removeLayer(distanceBadgeMarkerRef.current); } catch {}
        distanceBadgeMarkerRef.current = null;
      }
    }
  }, [myLocation, partnerLocation, actualDistanceMeters, isTogether, mapReady, displayAddress, user, partner, myName, partnerName]);

  // ─── 6. HIỂN THỊ ĐỊA ĐIỂM ĐÃ LƯU (SAVED PLACES) ───
  useEffect(() => {
    const placesLayer = placesLayerRef.current;
    if (!placesLayer) return;

    placesLayer.clearLayers();

    savedPlaces.forEach((place) => {
      const getIcon = (cat) => {
        if (cat === 'home') return '🏠';
        if (cat === 'work') return '💼';
        if (cat === 'dating') return '☕';
        return '📍';
      };

      const placeHtml = `
        <div class="flex flex-col items-center group">
          <div class="px-2 py-0.5 rounded-full bg-zinc-900/90 border border-white/20 text-white text-[10px] font-bold shadow-md whitespace-nowrap mb-0.5">
            ${getIcon(place.category)} ${place.name}
          </div>
          <div class="w-3 h-3 rounded-full bg-pink-500 border-2 border-white shadow-md"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-saved-place-pin',
        html: placeHtml,
        iconSize: [60, 40],
        iconAnchor: [30, 36]
      });

      const placeDirectionsUrl = getGoogleMapsDirectionsUrl(place.latitude, place.longitude);
      const placePopupContent = `
        <div style="font-family: inherit; min-width: 155px; text-align: center; padding: 2px;">
          <div style="font-weight: 800; font-size: 12px; color: #f472b6; margin-bottom: 2px;">
            ${getIcon(place.category)} ${place.name}
          </div>
          <a href="${placeDirectionsUrl}" target="_blank" rel="noopener noreferrer" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            width: 100%;
            margin-top: 6px;
            padding: 6px 10px;
            background: linear-gradient(135deg, #2563eb, #0284c7);
            color: white;
            font-size: 11px;
            font-weight: 700;
            border-radius: 10px;
            text-decoration: none;
            box-shadow: 0 3px 8px rgba(37,99,235,0.3);
          ">
            <span>🚗 Chỉ đường Google Maps</span>
          </a>
        </div>
      `;

      const marker = L.marker([place.latitude, place.longitude], { icon }).addTo(placesLayer);
      marker.bindPopup(placePopupContent, {
        className: 'custom-romantic-popup',
        offset: [0, -28],
        closeButton: false
      });
    });
  }, [savedPlaces]);

  const handleConfirmAddPlace = () => {
    if (!newPlaceName.trim() || !myLocation) return;
    addSavedPlace(newPlaceName, newPlaceCategory, myLocation.latitude, myLocation.longitude);
    setShowPlacesModal(false);
    setNewPlaceName('');
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden select-none z-0 bg-zinc-950">
      
      {/* ─── 1. BẢN ĐỒ TOÀN MÀN HÌNH (LEAFLET MAP CONTAINER NỀN ĐEN 100%) ─── */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full z-0 bg-zinc-950"
      />

      {/* ─── 2. FLOATING TOP HEADER ─── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pointer-events-none flex flex-col gap-1.5 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Badge Tên Tab & Trạng thái Live */}
          <div className="glass-panel px-3 py-2 rounded-2xl border border-white/15 shadow-xl backdrop-blur-xl pointer-events-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/30 flex-shrink-0">
              <Navigation size={16} className="fill-current rotate-45" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                <span>Couple Live Map</span>
                <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  !isOnline 
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    : (isRealtimeConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300')
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-amber-400' : (isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')}`}></span>
                  {!isOnline ? 'OFFLINE' : (isRealtimeConnected ? 'LIVE' : 'Đang kết nối')}
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400 font-medium truncate">
                {isTogether 
                  ? `💑 Đang ở bên cạnh ${partnerName} 💕` 
                  : (partnerLocation?.is_sharing !== false ? `Đồng bộ với ${partnerName}` : 'Người yêu chưa bật chia sẻ')}
              </p>
            </div>
          </div>

          {/* Công cụ trên Header */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={cycleMapStyle}
              className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all flex items-center justify-center"
              title={`Đổi kiểu bản đồ: ${TILE_PROVIDERS[mapStyle]?.name}`}
            >
              <Layers size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowPlacesModal(true)}
              className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all"
              title="Địa điểm yêu thích"
            >
              <MapPin size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all"
              title="Quyền riêng tư & Cài đặt định vị"
            >
              <Shield size={16} className={isSharingEnabled ? 'text-sky-400' : 'text-zinc-500'} />
            </button>
          </div>
        </div>

        {/* Thanh chuyển đổi nhanh chế độ định vị thông minh & Tiết kiệm pin */}
        <div className="flex items-center gap-1.5 pointer-events-auto overflow-x-auto no-scrollbar py-0.5">
          {locationMode === 'live_road' ? (
            <button
              type="button"
              onClick={() => deactivateLiveRoad('Đã chuyển sang chế độ Tiết kiệm pin 🍃')}
              className="px-3 py-1 rounded-2xl bg-gradient-to-r from-rose-500/30 to-pink-500/30 border border-rose-500/60 text-rose-200 text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-rose-500/20 backdrop-blur-xl active:scale-95 transition-all flex-shrink-0"
              title="Đang bật chế độ Đi đường Live. Bấm để tắt"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              <span>Đi đường Live 🛵 ({liveRoadRemainingMins}p)</span>
              <span className="text-[9px] bg-rose-500/40 text-rose-100 px-1.5 py-0.2 rounded-full font-bold ml-0.5">Tắt ✕</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => activateLiveRoad(45)}
              className="px-3 py-1 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-xl shadow-md active:scale-95 transition-all flex-shrink-0"
              title="Đang bật chế độ Tiết kiệm pin. Bấm để bật chế độ Đi đường Live 45 phút"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Tiết kiệm pin 🍃</span>
              <span className="text-[9px] text-emerald-400/80 font-normal">· Bật Live 🛵</span>
            </button>
          )}

          {!isOnline && (
            <div className="px-2.5 py-1 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xl flex-shrink-0">
              <WifiOff size={11} className="text-amber-400" />
              <span>Bản đồ ngoại tuyến ⚡</span>
            </div>
          )}

          {isStationary && locationMode === 'battery_saver' && isOnline && (
            <div className="px-2.5 py-1 rounded-2xl bg-zinc-900/80 border border-white/10 text-zinc-400 text-[10px] font-medium flex items-center gap-1 backdrop-blur-xl flex-shrink-0">
              <span>🍃 Đang nghỉ</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. BÁO LỖI GPS (NẾU CÓ) ─── */}
      {gpsStatus === 'denied' && (
        <div className="absolute top-24 left-3 right-3 z-30 max-w-md mx-auto p-3.5 bg-amber-500/25 border border-amber-500/40 rounded-2xl flex flex-col gap-2 text-xs text-amber-200 backdrop-blur-xl shadow-2xl animate-fade-in pointer-events-auto">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">Quyền vị trí đang bị chặn:</span>
                <p className="text-[11px] text-amber-100/90 leading-relaxed">
                  • Gạt tắt bong bóng chat Messenger nếu Android báo lỗi lớp phủ.
                  <br />
                  • Hoặc bấm vào biểu tượng <strong>ổ khóa 🔒 trên thanh địa chỉ</strong> &gt; chọn <strong>Vị trí (Cho phép)</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshLocation}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl font-black text-[11px] whitespace-nowrap active:scale-95 transition-all shadow-md flex-shrink-0"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. CÁC NÚT ĐIỀU KHIỂN NỔI BÊN PHẢI (FAB DOCK) ─── */}
      <div className="absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top,0.75rem))+74px)] z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Nút Đưa cả 2 vào khung hình */}
        <button
          type="button"
          onClick={fitBothInView}
          className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-rose-300 border border-rose-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center group"
          title="Đưa cả hai vào khung hình"
        >
          <Heart size={18} className="group-hover:scale-110 transition-transform fill-rose-500/30" />
        </button>

        {/* Nút Xem vị trí người yêu */}
        {partnerLocation?.latitude && partnerLocation?.is_sharing !== false && (
          <button
            type="button"
            onClick={focusPartner}
            className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-pink-300 border border-pink-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center group"
            title={`Tập trung vào ${partnerName}`}
          >
            <span className="text-sm group-hover:scale-110 transition-transform">❤️</span>
          </button>
        )}

        {/* Nút Xem vị trí của tôi */}
        <button
          type="button"
          onClick={focusMe}
          className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-sky-300 border border-sky-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center group"
          title="Vị trí của tôi"
        >
          <Navigation size={18} className="group-hover:scale-110 transition-transform" />
        </button>


        {/* Nút Lưu bản đồ khu vực này Offline */}
        <button
          type="button"
          onClick={() => downloadOfflineMapArea(myLocation?.latitude, myLocation?.longitude)}
          className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center group"
          title="Lưu bản đồ khu vực này để xem Offline khi mất mạng 🗺️"
        >
          <Download size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>


      {/* ─── 5. BOTTOM SHEET NỔI: THÔNG TIN CHI TIẾT & CHỈ ĐƯỜNG ─── */}
      <div className="absolute left-0 right-0 z-20 px-3 pointer-events-none max-w-md mx-auto bottom-[calc(76px+env(safe-area-inset-bottom,0px))]">
        {sheetCollapsed ? (
          /* Trạng thái thu gọn */
          <div 
            onClick={() => setSheetCollapsed(false)}
            className="glass-panel p-2.5 rounded-[24px] border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.7)] backdrop-blur-2xl pointer-events-auto flex items-center justify-between gap-2.5 cursor-pointer hover:border-rose-500/40 transition-all active:scale-98"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt={partnerName} className="w-8 h-8 rounded-full object-cover border-2 border-rose-500/60" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white font-black text-xs">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                  isPartnerStale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                }`} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white truncate block">{partnerName}</span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {partnerLocation?.speed && partnerLocation.speed > 1 ? formatSpeed(partnerLocation.speed) : 'Chạm để xem chi tiết'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isTogether 
                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' 
                  : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
              }`}>
                {isTogether ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ở cạnh nhau 💕</span>
                  </>
                ) : (
                  `Cách nhau ${formatDistance(actualDistanceMeters)}`
                )}
              </span>
              {!isTogether && partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation?.is_sharing !== false && (
                <a
                  href={getGoogleMapsDirectionsUrl(partnerLocation.latitude, partnerLocation.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md active:scale-90 flex items-center gap-1 text-[11px] font-bold px-2.5"
                  title="Chỉ đường Google Maps"
                >
                  <Navigation size={12} className="rotate-45 fill-white" />
                  <span>Chỉ đường</span>
                </a>
              )}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setSheetCollapsed(false); }}
                className="p-1 text-zinc-400 hover:text-white"
                title="Mở rộng"
              >
                <ChevronUp size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Trạng thái mở rộng đầy đủ */
          <div className="glass-panel p-3.5 sm:p-4 rounded-[28px] border border-white/20 shadow-[0_16px_45px_rgba(0,0,0,0.75)] backdrop-blur-2xl pointer-events-auto space-y-2.5 transition-all duration-300 max-h-[48vh] overflow-y-auto no-scrollbar">
            
            {/* Thanh gạt thu gọn */}
            <div 
              onClick={() => setSheetCollapsed(true)}
              className="flex items-center justify-center py-0.5 -mt-1 cursor-pointer group"
              title="Chạm để thu nhỏ lại"
            >
              <div className="w-10 h-1 bg-zinc-600/70 group-hover:bg-zinc-400 rounded-full transition-colors"></div>
            </div>

            {/* Header: Thông tin đối phương & Khoảng cách */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="relative flex-shrink-0 cursor-pointer"
                  onClick={focusPartner}
                  title={`Nhấn để xem vị trí của ${partnerName}`}
                >
                  {partner?.avatar_url ? (
                    <img src={partner.avatar_url} alt={partnerName} className="w-10 h-10 rounded-full object-cover border-2 border-rose-500/60 shadow-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white font-black text-sm shadow-md">
                      {partnerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {partnerLocation?.is_sharing !== false && (
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                      isPartnerStale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                    }`} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-white truncate">{partnerName}</h3>
                    {partnerLocation?.battery_level !== null && partnerLocation?.battery_level !== undefined && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-300 bg-white/10 px-1.5 py-0.2 rounded-full border border-white/10 flex-shrink-0">
                        {partnerLocation.is_charging ? <BatteryCharging size={11} className="text-emerald-400" /> : <Battery size={11} />}
                        <span>{partnerLocation.battery_level}%</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sky-300 font-bold flex items-center gap-1 truncate mt-0.5">
                    <MapPin size={12} className="flex-shrink-0 text-rose-400" />
                    <span className="truncate">{displayAddress}</span>
                  </p>
                </div>
              </div>

              {/* Huy hiệu khoảng cách góc phải */}
              <div className="text-right flex-shrink-0">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                  isTogether
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                    : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                }`}>
                  {isTogether ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ở cạnh nhau 🥰</span>
                    </>
                  ) : (
                    `Cách nhau ${formatDistance(actualDistanceMeters)}`
                  )}
                </span>
                <div className="text-[10px] text-zinc-400 font-medium mt-1">
                  {partnerLocation?.recorded_at ? formatTimeAgo(partnerLocation.recorded_at) : 'Chưa có tọa độ'}
                </div>
              </div>
            </div>

            {/* THẺ HÀNH ĐỘNG: KHI ĐANG Ở CẠNH NHAU vs KHI Ở XA */}
            {isTogether ? (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-purple-500/20 border border-rose-500/40 shadow-lg shadow-rose-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-lg shadow-md shrink-0">
                    💑
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">Hai bạn đang ở bên cạnh nhau! 💕</span>
                    <span className="text-[11px] text-rose-200/90 font-medium block truncate">
                      {actualDistanceMeters !== null && actualDistanceMeters < 30 ? 'Khoảng cách siêu gần (< 30m)' : `Khoảng cách ~${actualDistanceMeters}m`} · Chúc hai bạn hẹn hò vui vẻ 🥰
                    </span>
                  </div>
                </div>

                {partnerLocation?.latitude && (
                  <a
                    href={getGoogleMapsDirectionsUrl(partnerLocation.latitude, partnerLocation.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 active:scale-95 transition-all text-[11px] font-bold flex items-center gap-1 border border-white/10"
                    title="Mở Google Maps xem xung quanh quán"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ) : partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation?.is_sharing !== false ? (
              <div className="pt-0.5">
                <a
                  href={getGoogleMapsDirectionsUrl(partnerLocation.latitude, partnerLocation.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-blue-500/30 flex items-center justify-between transition-all no-underline border border-white/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Navigation size={14} className="rotate-45 fill-white text-white flex-shrink-0" />
                    <span className="truncate">Chỉ đường qua Google Maps 🚗</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-100 flex-shrink-0">
                    <span>Mở app</span>
                    <ExternalLink size={12} />
                  </div>
                </a>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                <div className="text-xs text-zinc-300">
                  <span className="font-bold">Chưa có tín hiệu GPS từ {partnerName}</span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">Đang chờ {partnerName} mở ứng dụng và chia sẻ vị trí.</span>
                </div>
              </div>
            )}

            {/* Cảnh báo pin yếu của người yêu */}
            {partnerLocation?.battery_level !== null && partnerLocation?.battery_level !== undefined && partnerLocation.battery_level <= 20 && !partnerLocation.is_charging && (
              <div className="px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
                <span className="flex items-center gap-1.5 truncate text-[11px]">
                  <BatteryLow size={15} className="text-amber-400 flex-shrink-0 animate-pulse" />
                  <span>Pin {partnerName} chỉ còn {partnerLocation.battery_level}% 🪫</span>
                </span>
                <button
                  type="button"
                  onClick={() => sendQuickStatus('Nhớ sạc pin điện thoại nha người yêu ơi ⚡')}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 text-[10px] font-black active:scale-95 transition-all flex items-center gap-1"
                >
                  <Zap size={11} />
                  <span>Nhắc sạc ⚡</span>
                </button>
              </div>
            )}

            {/* Thẻ trạng thái di chuyển & Lộ trình */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
              <div className="p-2 rounded-2xl bg-zinc-900/70 border border-white/5 flex flex-col">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-0.5">Trạng thái</span>
                <span className="font-bold text-white truncate text-[11px]">
                  {isTogether 
                    ? (partnerLocation?.speed && partnerLocation.speed > 1 
                        ? `💑 Cùng di chuyển (~${Math.round(partnerLocation.speed * 3.6)} km/h)` 
                        : '💑 Đang ở cùng bạn')
                    : (partnerLocation?.is_sharing === false 
                        ? 'Đã tạm dừng chia sẻ' 
                        : (isStationary && locationMode === 'battery_saver' ? 'Đang đứng yên (Tiết kiệm pin 🍃)' : formatSpeed(partnerLocation?.speed)))}
                </span>
              </div>

              <div className="p-2 rounded-2xl bg-zinc-900/70 border border-white/5 flex flex-col">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-0.5">Hôm nay</span>
                <span className="font-bold text-rose-300 truncate text-[11px]">
                  {todayStats?.partnerDistanceKm > 0 || todayStats?.myDistanceKm > 0
                    ? `${todayStats.partnerDistanceKm || 0} km (${partnerName})`
                    : 'Chưa có di chuyển'}
                </span>
              </div>
            </div>


            {/* Nút gửi trạng thái nhanh cho người yêu */}
            <div className="pt-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                <Send size={11} className="text-rose-400" />
                <span>Gửi cập nhật nhanh cho {partnerName}:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {(isTogether ? [
                  { text: '🥤 Em muốn uống gì để anh mua nha 🧋', icon: '🧋' },
                  { text: '📸 Chụp tấm hình kỷ niệm nha 📸', icon: '📸' },
                  { text: '👫 Nắm tay nhau đi dạo nè 💖', icon: '👫' },
                  { text: '🍜 Lát mình đi ăn gì tiếp không? 🍕', icon: '🍕' },
                  { text: '🥰 Ở cạnh người yêu thích thật 💕', icon: '💕' }
                ] : [
                  { text: 'Đang trên đường về 🛵', icon: '🛵' },
                  { text: 'Đã về đến nhà an toàn 🏠', icon: '🏠' },
                  { text: 'Đang ở chỗ làm 💼', icon: '💼' },
                  { text: 'Nhớ YOU quá 💕', icon: '💕' }
                ]).map((msg) => (
                  <button
                    key={msg.text}
                    type="button"
                    onClick={() => sendQuickStatus(msg.text)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-[10px] text-zinc-300 hover:text-white whitespace-nowrap transition-all flex items-center gap-1"
                  >
                    <span>{msg.icon}</span>
                    <span>{msg.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 6. MODAL CÀI ĐẶT CHIA SẺ & HƯỚNG DẪN CHẠY NGẦM ─── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/15 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col relative text-zinc-100 animate-slide-up">
            
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Quyền Riêng Tư &amp; Chạy Ngầm</h3>
                <p className="text-xs text-zinc-400 font-medium">Toàn quyền kiểm soát chia sẻ GPS</p>
              </div>
            </div>

            {/* Toggle chia sẻ chính */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-white">Chia sẻ vị trí với người yêu</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {isSharingEnabled ? 'Người yêu có thể xem vị trí của bạn' : 'Đã tắt hoàn toàn chia sẻ vị trí'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSharing(!isSharingEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  isSharingEnabled ? 'bg-sky-500' : 'bg-zinc-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isSharingEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Lựa chọn Chế độ Định vị thông minh */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5 mb-3.5">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Chế độ định vị</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  locationMode === 'live_road' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {locationMode === 'live_road' ? `Đi đường (${liveRoadRemainingMins}p)` : 'Tiết kiệm pin 🍃'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => deactivateLiveRoad('Đã chuyển sang chế độ Tiết kiệm pin 🍃')}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    locationMode === 'battery_saver'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-zinc-800/40 border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <span>🍃 Tiết kiệm pin</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Tự ngủ khi đứng yên hoặc tắt màn hình. Tiết kiệm 90% pin.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => activateLiveRoad(45)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    locationMode === 'live_road'
                      ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-sm'
                      : 'bg-zinc-800/40 border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-rose-400 flex items-center gap-1">
                    <span>🛵 Đi đường Live</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Giữ GPS liên tục khi đi xe. Tự ngắt sau 45p hoặc khi về nhà.
                  </div>
                </button>
              </div>

              {/* Nút lưu bản đồ offline */}
              <button
                type="button"
                onClick={() => downloadOfflineMapArea(myLocation?.latitude, myLocation?.longitude)}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Download size={13} />
                <span>Lưu bản đồ khu vực này để xem Offline 🗺️</span>
              </button>
            </div>

            {/* Hướng dẫn tối ưu */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-300 space-y-2 mb-4 max-h-[30vh] overflow-y-auto no-scrollbar">
              <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                <span>💡</span>
                <span>Tối ưu trải nghiệm như App Store / CH Play:</span>
              </div>
              
              <div className="space-y-1.5 text-[11px] text-zinc-300/95 leading-relaxed">
                <p className="font-semibold text-white">1. Cài ứng dụng ra Màn hình chính (PWA):</p>
                <p className="text-zinc-400 pl-3">
                  • Mở trình duyệt Chrome/Safari &gt; bấm menu 3 chấm ⋮ &gt; chọn <em>"Thêm vào Màn hình chính"</em> (hoặc <em>"Cài đặt ứng dụng"</em>) để ứng dụng chạy độc lập, mượt mà hơn.
                </p>

                <p className="font-semibold text-white pt-1">2. Xem bản đồ ngoại tuyến khi không có mạng:</p>
                <p className="text-zinc-400 pl-3">
                  • Bản đồ tự động lưu vào bộ nhớ máy mỗi khi bạn lướt xem. Bấm nút <strong>Lưu bản đồ</strong> ở trên để xem trơn tru ngay cả khi tắt 4G/Wifi.
                </p>
              </div>
            </div>


            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-zinc-950 font-black text-xs rounded-2xl transition-all shadow-lg shadow-sky-500/20 active:scale-98"
            >
              Đã hiểu &amp; Hoàn tất
            </button>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL ĐỊA ĐIỂM YÊU THÍCH (SAVED PLACES) ─── */}
      {showPlacesModal && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/15 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col max-h-[85vh] relative text-zinc-100 animate-slide-up">
            
            <button
              type="button"
              onClick={() => setShowPlacesModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Địa Điểm Yêu Thích</h3>
                <p className="text-xs text-zinc-400 font-medium">Lưu ghim các chốn thân quen của hai bạn</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5 mb-4">
              <div className="text-xs font-bold text-zinc-300">Ghim vị trí hiện tại:</div>
              <input
                type="text"
                placeholder="Tên địa điểm (vd: Nhà anh, Quán cafe hẹn hò...)"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 font-medium"
              />

              <div className="flex gap-1.5">
                {[
                  { id: 'home', label: 'Nhà 🏠' },
                  { id: 'work', label: 'Chỗ làm 💼' },
                  { id: 'dating', label: 'Hò hẹn ☕' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNewPlaceCategory(cat.id)}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      newPlaceCategory === cat.id 
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300' 
                        : 'bg-zinc-800/60 border-transparent text-zinc-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!newPlaceName.trim() || !myLocation}
                onClick={handleConfirmAddPlace}
                className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>Lưu ghim vào bản đồ</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Các địa điểm đã ghim ({savedPlaces.length})
              </div>
              {savedPlaces.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Chưa có địa điểm nào được lưu.
                </div>
              ) : (
                savedPlaces.map(place => (
                  <div key={place.id} className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{place.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {place.category === 'home' ? 'Nhà riêng' : place.category === 'work' ? 'Nơi làm việc' : 'Địa điểm hẹn hò'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={getGoogleMapsDirectionsUrl(place.latitude, place.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 px-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1 transition-all no-underline"
                        title="Chỉ đường Google Maps đến địa điểm này"
                      >
                        <Navigation size={11} className="rotate-45 fill-current" />
                        <span>Chỉ đường</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteSavedPlace(place.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Xóa địa điểm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

