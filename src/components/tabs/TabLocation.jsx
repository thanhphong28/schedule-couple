// components/tabs/TabLocation.jsx
// Tab Vị Trí Cặp Đôi (Couple Live Map)
// Bản đồ thời gian thực hiển thị vị trí hai người yêu, khoảng cách, tốc độ, địa chỉ và quyền riêng tư
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCoupleLocation } from '../../hooks/useCoupleLocation.js';
import { 
  formatDistance, 
  formatSpeed, 
  formatTimeAgo,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl
} from '../../services/geolocationService.js';
import { 
  Navigation, Heart, MapPin, Shield, RefreshCw, Layers, 
  Send, Compass, Battery, BatteryCharging, AlertTriangle, 
  Check, X, Eye, EyeOff, Sparkles, Plus, Trash2, Home, Briefcase, Coffee,
  ExternalLink
} from 'lucide-react';

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
    gpsError,
    isRealtimeConnected,
    sendQuickStatus,
    myStatusMessage,
    refreshLocation
  } = useCoupleLocation();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const myMarkerRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const polylineRef = useRef(null);
  const placesLayerRef = useRef(null);

  // Chế độ bản đồ: 'dark' (CartoDB Dark Matter) | 'light' (CartoDB Voyager)
  const [mapStyle, setMapStyle] = useState('dark');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlacesModal, setShowPlacesModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('home');
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const hasFittedBothRef = useRef(false);
  const hasFittedMyLocRef = useRef(false);

  console.log('TabLocation state:', {
    myLocation,
    partnerLocation,
    mapReady,
    hasMap: !!mapInstanceRef.current
  });

  // ─── 1. KHỞI TẠO BẢN ĐỒ LEAFLET ───
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Tọa độ mặc định (Việt Nam) nếu chưa có GPS
    const defaultLat = myLocation?.latitude || partnerLocation?.latitude || 10.7960;
    const defaultLng = myLocation?.longitude || partnerLocation?.longitude || 106.6840;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abc',
      className: mapStyle === 'dark' ? 'romantic-dark-tiles' : ''
    }).addTo(map);

    // Layer nhóm cho các địa điểm đã lưu
    const placesLayer = L.layerGroup().addTo(map);
    placesLayerRef.current = placesLayer;

    mapInstanceRef.current = map;
    mapInstanceRef.current._tileLayer = tiles;
    setMapReady(true);

    // Đảm bảo Leaflet tính toán chính xác kích thước container sau khi DOM render
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      try {
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
      myMarkerRef.current = null;
      partnerMarkerRef.current = null;
      accuracyCircleRef.current = null;
      polylineRef.current = null;
      placesLayerRef.current = null;
      hasFittedBothRef.current = false;
      hasFittedMyLocRef.current = false;
      setMapReady(false);
    };
  }, []);

  // ─── ĐỔI GIAO DIỆN TILE KHI CHỌN MAP STYLE ───
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._tileLayer) return;
    mapInstanceRef.current.removeLayer(mapInstanceRef.current._tileLayer);

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const newTiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abc',
      className: mapStyle === 'dark' ? 'romantic-dark-tiles' : ''
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current._tileLayer = newTiles;
  }, [mapStyle]);

  // Helper hàm di chuyển tâm bản đồ tính đến Bottom Sheet (dịch tâm xuống để Marker hiện ở phần trên thoáng)
  const flyToOffset = (map, lat, lng, zoom = 16, offsetY = 90) => {
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

  // ─── TỰ ĐỘNG CĂN CHỈNH CAMERA ĐỂ CẢ 2 NGƯỜI LUÔN XUẤT HIỆN RÕ RÀNG TRÊN MÀN HÌNH ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation.is_sharing !== false;

    // Khi có vị trí của CẢ 2 NGƯỜI: lập tức fit cả 2 vào khung hình nhìn thấy được (trên bottom sheet)
    if (hasMyLoc && hasPartnerLoc) {
      if (!hasFittedBothRef.current) {
        map.fitBounds([
          [myLocation.latitude, myLocation.longitude],
          [partnerLocation.latitude, partnerLocation.longitude]
        ], {
          paddingTopLeft: [50, 90], // tránh header trên cùng
          paddingBottomRight: [70, 320], // tránh bottom sheet bên dưới
          maxZoom: 16
        });
        hasFittedBothRef.current = true;
      }
    } else if (hasMyLoc && !hasPartnerLoc) {
      // Khi có vị trí của Tôi (chưa có vị trí đối phương)
      // Nếu là vị trí GPS thật hoặc chưa từng fit vị trí ban đầu
      if (!hasFittedMyLocRef.current || !myLocation?.is_initial_placeholder) {
        flyToOffset(map, myLocation.latitude, myLocation.longitude, 16, 90);
        if (!myLocation?.is_initial_placeholder) {
          hasFittedMyLocRef.current = true;
        }
      }
    }
  }, [myLocation, partnerLocation, mapReady]);

  // ─── 2. VẼ / CẬP NHẬT MARKER CỦA TÔI (MY LOCATION) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!myLocation?.latitude || !myLocation?.longitude) {
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

    const { latitude, longitude, accuracy } = myLocation;
    const myName = user?.display_name || user?.full_name || 'Tôi';
    const avatar = user?.avatar_url;

    // Custom HTML Avatar Marker cho Tôi với viền cyan phát sáng và badge định danh rõ nét
    const myHtml = `
      <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
        <!-- Vòng sóng radar lan tỏa phát sáng -->
        <div class="absolute -inset-2.5 rounded-full bg-sky-400/35 animate-ping opacity-75 pointer-events-none"></div>
        <div class="relative rounded-full shadow-[0_0_24px_rgba(56,189,248,0.85)] bg-zinc-900 overflow-hidden flex items-center justify-center" style="width: 48px; height: 48px; border: 3px solid #38bdf8;">
          ${avatar 
            ? `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${myName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=0284c7&color=fff';"/>`
            : `<div class="w-full h-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center font-black text-white text-base">${myName.charAt(0).toUpperCase()}</div>`
          }
        </div>
        <!-- Badge định danh Tôi rõ ràng -->
        <div class="absolute -bottom-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/50 flex items-center gap-0.5 whitespace-nowrap pointer-events-none">
          <span>💙</span><span>${myName} (Tôi)</span>
        </div>
      </div>
    `;

    const myIcon = L.divIcon({
      className: 'custom-my-location-marker',
      html: myHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
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

    // Popup khi nhấn vào vị trí của Tôi trên bản đồ
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

    // Vẽ vòng sai số GPS
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
  }, [myLocation, user, mapReady]);

  // ─── 3. VẼ / CẬP NHẬT MARKER CỦA NGƯỜI YÊU (PARTNER LOCATION) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!partnerLocation?.latitude || !partnerLocation?.longitude || partnerLocation.is_sharing === false) {
      if (partnerMarkerRef.current) {
        try { map.removeLayer(partnerMarkerRef.current); } catch {}
        partnerMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude, status_message } = partnerLocation;
    const partnerName = partner?.display_name || partner?.full_name || 'Người yêu';
    const avatar = partner?.avatar_url;

    // Custom HTML Avatar Marker cho người yêu với viền hồng tình yêu và bóng tim
    const partnerHtml = `
      <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
        <!-- Bong bóng trạng thái nếu người yêu có gửi lời nhắn -->
        ${status_message ? `
          <div class="absolute -top-8 bg-zinc-900/90 backdrop-blur-md border border-rose-500/40 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap animate-bounce flex items-center gap-1">
            <span>💬</span><span>${status_message}</span>
          </div>
        ` : ''}
        <!-- Vòng sóng radar tình yêu -->
        <div class="absolute -inset-2.5 rounded-full bg-rose-500/25 animate-ping opacity-60 pointer-events-none"></div>
        <div class="relative rounded-full shadow-[0_0_24px_rgba(244,63,94,0.7)] bg-zinc-900 overflow-hidden flex items-center justify-center" style="width: 48px; height: 48px; border: 3px solid #f43f5e;">
          ${avatar 
            ? `<img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${partnerName}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=f43f5e&color=fff';"/>`
            : `<div class="w-full h-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center font-black text-white text-base">${partnerName.charAt(0).toUpperCase()}</div>`
          }
        </div>
        <!-- Badge định danh Người yêu -->
        <div class="absolute -bottom-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white/40 flex items-center gap-0.5 whitespace-nowrap pointer-events-none">
          <span>❤️</span><span>${partnerName}</span>
        </div>
      </div>
    `;

    const partnerIcon = L.divIcon({
      className: 'custom-partner-location-marker',
      html: partnerHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
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

    // Popup thông tin & nút Chỉ đường Google Maps khi nhấn vào đối phương trên bản đồ
    const directionsUrl = getGoogleMapsDirectionsUrl(latitude, longitude);
    const shortPartnerAddress = partnerLocation?.address_name ? partnerLocation.address_name.split(',').slice(0, 2).join(',') : 'Vị trí hiện tại';
    const partnerPopupContent = `
      <div style="font-family: inherit; min-width: 175px; text-align: center; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 800; font-size: 13px; color: #f43f5e; margin-bottom: 2px;">
          <span>❤️</span>
          <span>${partnerName}</span>
        </div>
        <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 8px; line-height: 1.3;">
          ${shortPartnerAddress}
        </div>
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
  }, [partnerLocation, partner, mapReady]);

  // ─── 4. ĐƯỜNG KẾT NỐI TÌNH YÊU GIỮA HAI NGƯỜI (POLYLINE) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation.is_sharing !== false;

    if (hasMyLoc && hasPartnerLoc) {
      const latlngs = [
        [myLocation.latitude, myLocation.longitude],
        [partnerLocation.latitude, partnerLocation.longitude]
      ];

      if (!polylineRef.current || !map.hasLayer(polylineRef.current)) {
        if (polylineRef.current) {
          try { map.removeLayer(polylineRef.current); } catch {}
        }
        polylineRef.current = L.polyline(latlngs, {
          color: '#fb7185',
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(latlngs);
      }
    } else {
      if (polylineRef.current) {
        try { map.removeLayer(polylineRef.current); } catch {}
        polylineRef.current = null;
      }
    }
  }, [myLocation, partnerLocation, mapReady]);

  // ─── 5. HIỂN THỊ ĐỊA ĐIỂM ĐÃ LƯU (SAVED PLACES) ───
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

  // ─── SMART CAMERA ACTIONS ───
  const fitBothInView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasMyLoc = myLocation?.latitude && myLocation?.longitude;
    const hasPartnerLoc = partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation?.is_sharing !== false;

    if (hasMyLoc && hasPartnerLoc) {
      map.fitBounds([
        [myLocation.latitude, myLocation.longitude],
        [partnerLocation.latitude, partnerLocation.longitude]
      ], {
        paddingTopLeft: [50, 90],
        paddingBottomRight: [70, 340],
        maxZoom: 16
      });
    } else if (hasMyLoc) {
      flyToOffset(map, myLocation.latitude, myLocation.longitude, 16, 90);
    } else if (hasPartnerLoc) {
      flyToOffset(map, partnerLocation.latitude, partnerLocation.longitude, 16, 90);
    }
  };

  const focusPartner = () => {
    if (mapInstanceRef.current && partnerLocation?.latitude) {
      flyToOffset(mapInstanceRef.current, partnerLocation.latitude, partnerLocation.longitude, 16, 90);
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.openPopup();
      }
    }
  };

  const focusMe = () => {
    if (mapInstanceRef.current && myLocation?.latitude) {
      flyToOffset(mapInstanceRef.current, myLocation.latitude, myLocation.longitude, 16, 90);
      if (myMarkerRef.current) {
        myMarkerRef.current.openPopup();
      }
    } else {
      refreshLocation();
    }
  };

  // Thêm địa điểm hiện tại làm địa điểm yêu thích
  const handleSaveCurrentLocation = () => {
    if (!myLocation?.latitude) return;
    setNewPlaceName(myLocation.address_name?.split(',')[0] || 'Địa điểm yêu thích');
    setShowPlacesModal(true);
  };

  const handleConfirmAddPlace = () => {
    if (!newPlaceName.trim() || !myLocation) return;
    addSavedPlace(newPlaceName, newPlaceCategory, myLocation.latitude, myLocation.longitude);
    setShowPlacesModal(false);
    setNewPlaceName('');
  };

  const partnerName = partner?.display_name || partner?.full_name || 'Người yêu';

  return (
    <div className="relative w-full h-[calc(100dvh-120px)] overflow-hidden flex flex-col select-none">
      
      {/* ─── 1. BẢN ĐỒ TOÀN MÀN HÌNH (LEAFLET MAP CONTAINER) ─── */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full z-0 bg-zinc-950"
      />

      {/* ─── 2. FLOATING HEADER: TRẠNG THÁI & KHOẢNG CÁCH ─── */}
      <div className="relative z-10 px-3 pt-2 pointer-events-none flex items-center justify-between gap-2">
        {/* Badge Tên Tab & Trạng thái Live */}
        <div className="glass-panel px-3 py-2 rounded-2xl border border-white/10 shadow-lg pointer-events-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/30">
            <Navigation size={16} className="fill-current rotate-45" />
          </div>
          <div>
            <h2 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>Couple Live Map</span>
              <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                isRealtimeConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {isRealtimeConnected ? 'LIVE' : 'Đang kết nối'}
              </span>
            </h2>
            <p className="text-[10px] text-zinc-400 font-medium">
              {partnerLocation?.is_sharing !== false ? `Đồng bộ với ${partnerName}` : 'Người yêu chưa bật chia sẻ'}
            </p>
          </div>
        </div>

        {/* Nút cài đặt chia sẻ & địa điểm */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowPlacesModal(true)}
            className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all"
            title="Địa điểm yêu thích"
          >
            <MapPin size={17} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all"
            title="Quyền riêng tư & Cài đặt"
          >
            <Shield size={17} className={isSharingEnabled ? 'text-sky-400' : 'text-zinc-500'} />
          </button>
        </div>
      </div>

      {/* ─── 3. BÁO LỖI GPS HOẶC CHƯA CẤP QUYỀN (NẾU CÓ) ─── */}
      {gpsStatus === 'denied' && (
        <div className="relative z-10 mx-3 mt-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
            <span>Trình duyệt đang chặn GPS. Hãy cho phép vị trí để chia sẻ với người yêu.</span>
          </div>
          <button
            type="button"
            onClick={refreshLocation}
            className="px-2.5 py-1 bg-amber-500 text-zinc-950 rounded-xl font-bold text-[11px] whitespace-nowrap ml-2"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── 4. CÁC NÚT ĐIỀU KHIỂN CAMERA NỔI (MAP FAB CONTROLS) ─── */}
      <div className="absolute right-3 top-20 z-10 flex flex-col gap-2 pointer-events-auto">
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
            className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-pink-300 border border-pink-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center"
            title={`Tập trung vào ${partnerName}`}
          >
            <Compass size={18} />
          </button>
        )}

        {/* Nút Xem vị trí của tôi */}
        <button
          type="button"
          onClick={focusMe}
          className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-sky-300 border border-sky-500/30 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center"
          title="Vị trí của tôi"
        >
          <Navigation size={18} />
        </button>

        {/* Nút Chuyển đổi bản đồ Dark / Light */}
        <button
          type="button"
          onClick={() => setMapStyle(prev => prev === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-white/10 shadow-xl backdrop-blur-md active:scale-90 transition-all flex items-center justify-center"
          title="Đổi kiểu bản đồ"
        >
          <Layers size={18} />
        </button>
      </div>

      {/* ─── 5. BOTTOM SHEET NỔI: THÔNG TIN CỦA ĐỐI PHƯƠNG & CHỈ ĐƯỜNG GOOGLE MAPS ─── */}
      <div className="mt-auto relative z-10 px-3 pb-3 pointer-events-none">
        <div className="glass-panel p-4 rounded-[28px] border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-auto space-y-3">
          
          {/* Thanh kéo thu gọn/mở rộng */}
          <div 
            onClick={() => setSheetCollapsed(!sheetCollapsed)}
            className="flex items-center justify-center py-0.5 -mt-1 cursor-pointer"
          >
            <div className="w-10 h-1 bg-zinc-600/60 rounded-full"></div>
          </div>

          {/* Card Thông tin Người yêu */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="relative flex-shrink-0 cursor-pointer"
                onClick={focusPartner}
                title={`Nhấn để xem vị trí của ${partnerName}`}
              >
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt={partnerName} className="w-11 h-11 rounded-full object-cover border-2 border-rose-500/60 shadow-md" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                {partnerLocation?.is_sharing !== false && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
                    isPartnerStale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                  }`} />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white truncate">{partnerName}</h3>
                  {partnerLocation?.battery_level !== null && partnerLocation?.battery_level !== undefined && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-300 bg-white/10 px-1.5 py-0.2 rounded-full border border-white/10">
                      {partnerLocation.is_charging ? <BatteryCharging size={11} className="text-emerald-400" /> : <Battery size={11} />}
                      <span>{partnerLocation.battery_level}%</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-sky-300 font-bold flex items-center gap-1 truncate mt-0.5">
                  <MapPin size={12} className="flex-shrink-0 text-rose-400" />
                  <span className="truncate">{partnerLocation?.address_name || 'Đang chờ cập nhật địa chỉ...'}</span>
                </p>
              </div>
            </div>

            {/* Khoảng cách giữa 2 người */}
            <div className="text-right flex-shrink-0 pl-2">
              <div className="text-base font-black text-rose-300 leading-tight">
                {formatDistance(distanceBetweenMeters)}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">
                {partnerLocation?.recorded_at ? formatTimeAgo(partnerLocation.recorded_at) : 'Chưa có tọa độ'}
              </div>
            </div>
          </div>

          {/* Nút chỉ đường Google Maps (khi có vị trí người yêu) */}
          {partnerLocation?.latitude && partnerLocation?.longitude && partnerLocation?.is_sharing !== false ? (
            <div className="pt-0.5">
              <a
                href={getGoogleMapsDirectionsUrl(partnerLocation.latitude, partnerLocation.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-blue-500/30 flex items-center justify-between transition-all no-underline overflow-hidden border border-white/20"
                title={`Chỉ đường qua Google Maps đến chỗ ${partnerName}`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Navigation size={14} className="rotate-45 fill-white text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="truncate text-left">
                    <div className="font-black text-xs leading-tight">Chỉ đường qua Google Maps 🚗</div>
                    <div className="text-[10px] text-blue-100 font-medium truncate mt-0.5">
                      Dẫn đường trực tiếp đến chỗ {partnerName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-[10px] font-bold text-blue-100 bg-white/15 px-2 py-1 rounded-xl border border-white/15 shadow-sm">
                  <span>Mở Google Maps</span>
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

          {/* Phần mở rộng khi không bị thu gọn */}
          {!sheetCollapsed && (
            <>
              {/* Thẻ trạng thái di chuyển & GPS */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-0.5">Trạng thái</span>
                  <span className="font-bold text-white truncate">
                    {partnerLocation?.is_sharing === false 
                      ? 'Đã tạm dừng chia sẻ' 
                      : formatSpeed(partnerLocation?.speed)}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-0.5">Độ chính xác GPS</span>
                  <span className="font-bold text-zinc-200">
                    {partnerLocation?.accuracy ? `Sai số ±${partnerLocation.accuracy}m` : 'Tiêu chuẩn'}
                  </span>
                </div>
              </div>

              {/* Nút gửi trạng thái nhanh cho người yêu */}
              <div className="pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1.5">
                  <Send size={12} className="text-rose-400" />
                  <span>Gửi cập nhật nhanh cho {partnerName}:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { text: 'Đang trên đường về 🛵', icon: '🛵' },
                    { text: 'Đã về đến nhà an toàn 🏠', icon: '🏠' },
                    { text: 'Đang ở chỗ làm 💼', icon: '💼' },
                    { text: 'Nhớ YOU quá 💕', icon: '💕' }
                  ].map((msg) => (
                    <button
                      key={msg.text}
                      type="button"
                      onClick={() => sendQuickStatus(msg.text)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-[11px] text-zinc-300 hover:text-white whitespace-nowrap transition-all flex items-center gap-1"
                    >
                      <span>{msg.icon}</span>
                      <span>{msg.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── 6. MODAL CÀI ĐẶT CHIA SẺ & QUYỀN RIÊNG TƯ ─── */}
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
                <h3 className="text-base font-black text-white">Quyền Riêng Tư Vị Trí</h3>
                <p className="text-xs text-zinc-400 font-medium">Bạn có toàn quyền kiểm soát chia sẻ GPS</p>
              </div>
            </div>

            {/* Toggle chia sẻ chính */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-white">Chia sẻ vị trí của tôi</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {isSharingEnabled ? 'Người yêu có thể xem vị trí của bạn' : 'Đã tắt hoàn toàn chia sẻ vị trí'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSharing(!isSharingEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isSharingEnabled ? 'bg-sky-500' : 'bg-zinc-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isSharingEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>


            {/* Ghi chú về nền tảng Web & Giới hạn chạy nền */}
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-xs text-sky-200/90 leading-relaxed mb-4 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sky-300">
                <span>💡</span>
                <span>Thông tin kỹ thuật minh bạch:</span>
              </div>
              <p className="text-[11px]">
                • Vị trí đồng bộ thời gian thực siêu mượt khi bạn đang mở ứng dụng.
              </p>
              <p className="text-[11px]">
                • Trên nền tảng Web/PWA, khi khóa màn hình hoặc đóng app, trình duyệt sẽ tạm dừng lấy GPS để bảo vệ quyền riêng tư và tiết kiệm pin thiết bị của bạn.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-zinc-950 font-black text-xs rounded-2xl transition-all"
            >
              Đã hiểu & Hoàn tất
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

            {/* Form thêm địa điểm từ vị trí hiện tại */}
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

            {/* Danh sách địa điểm đã lưu */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Các địa điểm đã ghim ({savedPlaces.length})
              </div>
              {savedPlaces.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Chưa có địa điểm nào được lưu. Hãy ghim ngôi nhà hoặc nơi hẹn hò yêu thích nhé!
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
