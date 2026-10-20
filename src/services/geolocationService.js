// services/geolocationService.js
// Các tiện ích xử lý tọa độ GPS, khoảng cách Haversine, Reverse Geocoding và trạng thái thiết bị

// ─── 1. TÍNH KHOẢNG CÁCH ĐỊA LÝ (HAVERSINE FORMULA) ───
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Trả về khoảng cách theo mét
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return 'Không rõ';
  if (meters < 30) return '< 30m';
  if (meters < 70) return '< 70m';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── 2. TÍNH GÓC PHƯƠNG VỊ (BEARING) GIỮA HAI TỌA ĐỘ ───
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return (theta * 180 / Math.PI + 360) % 360;
}

// ─── 3. ĐỊNH DẠNG TỐC ĐỘ ───
export function formatSpeed(speedMps) {
  if (!speedMps || speedMps < 0.5) return 'Đang đứng yên';
  const kmh = Math.round(speedMps * 3.6);
  if (kmh < 6) return `Đi bộ (~${kmh} km/h)`;
  if (kmh < 25) return `Di chuyển chậm (~${kmh} km/h)`;
  return `Đang trên xe (~${kmh} km/h)`;
}

// ─── 4. ĐỊNH DẠNG THỜI GIAN CẬP NHẬT GẦN NHẤT ───
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Chưa cập nhật';
  const now = new Date();
  const past = new Date(timestamp);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 5) return 'Vừa xong (Live)';
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${Math.floor(diffHour / 24)} ngày trước`;
}

// ─── 5. KIỂM TRA TỌA ĐỘ CŨ (STALE DATA CHECK) ───
export function isLocationStale(timestamp, thresholdSeconds = 120) {
  if (!timestamp) return true;
  const diffSec = Math.floor((new Date() - new Date(timestamp)) / 1000);
  return diffSec > thresholdSeconds;
}

// ─── 6. REVERSE GEOCODING VỚI CACHE ĐỊA CHỈ (NOMINATIM) ───
const geocodeCache = new Map();

export async function reverseGeocode(lat, lon) {
  if (!lat || !lon) return '';
  // Làm tròn tọa độ 3 số thập phân (~110m) để cache hiệu quả, tránh spam server
  const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // Thử đọc từ localStorage
  const localKey = `sc_geo_${cacheKey}`;
  const localVal = localStorage.getItem(localKey);
  if (localVal) {
    geocodeCache.set(cacheKey, localVal);
    return localVal;
  }

  // 1. Thử Nominatim OpenStreetMap
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'vi,en;q=0.9',
          'User-Agent': 'CoupleScheduleLiveMap/1.0'
        },
        signal: AbortSignal.timeout(2800)
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.suburb || addr.neighbourhood || '';
      const district = addr.city_district || addr.district || addr.suburb || '';
      const city = addr.city || addr.state || addr.province || '';

      let shortAddress = [road, district, city].filter(Boolean).join(', ');
      if (!shortAddress && data.display_name) {
        shortAddress = data.display_name.split(',').slice(0, 3).join(',');
      }

      if (shortAddress) {
        geocodeCache.set(cacheKey, shortAddress);
        try { localStorage.setItem(localKey, shortAddress); } catch {}
        return shortAddress;
      }
    }
  } catch {
    // Nominatim timeout hoặc rate limit, chuyển sang fallback
  }

  // 2. Fallback BigDataCloud (Miễn phí, không rate limit, chuyên tiếng Việt siêu nhanh)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.subLocality || '';
      const district = bdcData.city || bdcData.principalSubdivision || '';
      let bdcAddress = [locality, district].filter(Boolean).join(', ');
      if (bdcAddress) {
        geocodeCache.set(cacheKey, bdcAddress);
        try { localStorage.setItem(localKey, bdcAddress); } catch {}
        return bdcAddress;
      }
    }
  } catch {}

  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

// ─── 7. KIỂM TRA MỨC PIN THIẾT BỊ THỰC TẾ (NẾU TRÌNH DUYỆT HỖ TRỢ) ───
// Không bao giờ giả lập pin nếu trình duyệt không hỗ trợ Battery API (như iOS Safari)
export async function getDeviceBatterySafe() {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging
      };
    }
  } catch {
    // Battery API blocked or not supported
  }
  return null;
}

// ─── 8. GOOGLE MAPS NAVIGATION & DIRECTIONS URL SCHEME ───
// Mở Google Maps chuẩn Universal URL: Tự động deep link vào App Google Maps (iOS/Android)
// hoặc mở Web Google Maps với chế độ Chỉ đường (Turn-by-turn Navigation)
export function getGoogleMapsDirectionsUrl(lat, lon, travelMode = 'driving') {
  if (!lat || !lon) return '#';
  // destination là tọa độ GPS chính xác của đối phương
  // Không gán cứng origin để Google Maps tự động lấy vị trí hiện tại hoặc cho phép người dùng chọn điểm xuất phát đã lưu (Nhà, Cơ quan...)
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${travelMode}`;
}

export function getGoogleMapsSearchUrl(lat, lon) {
  if (!lat || !lon) return '#';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

// ─── 9. ĐỊNH VỊ QUA ĐỊA CHỈ IP DỰ PHÒNG KHI THIẾT BỊ CHƯA CÓ TỌA ĐỘ GPS ───
export async function getIpLocationFallback() {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude && data.success !== false) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          city: data.city || 'TP. Hồ Chí Minh',
          region: data.region || 'Việt Nam',
          accuracy: 500,
          isIpFallback: true
        };
      }
    }
  } catch {
    try {
      const res2 = await fetch('https://ipapi.co/json/');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.latitude && data2.longitude && !data2.error) {
          return {
            latitude: Number(data2.latitude),
            longitude: Number(data2.longitude),
            city: data2.city || 'TP. Hồ Chí Minh',
            region: data2.region || 'Việt Nam',
            accuracy: 500,
            isIpFallback: true
          };
        }
      }
    } catch {}
  }

  return {
    latitude: 10.7769,
    longitude: 106.7009,
    city: 'Hồ Chí Minh',
    region: 'Việt Nam',
    accuracy: 1000,
    isIpFallback: true
  };
}

// ─── 10. TÍNH TOÁN QUẢNG ĐƯỜNG LỘ TRÌNH (KM) ───
export function calculateTrailDistance(trail) {
  if (!Array.isArray(trail) || trail.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 1; i < trail.length; i++) {
    const p1 = trail[i - 1];
    const p2 = trail[i];
    if (p1?.lat && p1?.lng && p2?.lat && p2?.lng) {
      const d = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      if (d && d < 10000) { // Lọc các bước nhảy GPS lỗi > 10km
        totalMeters += d;
      }
    }
  }
  return Number((totalMeters / 1000).toFixed(2)); // Trả về số km
}

// ─── 11. HỖ TRỢ TÍNH TOÁN TOẠ ĐỘ MẢNH BẢN ĐỒ ĐỂ LƯU OFFLINE (WEB MERCATOR) ───
export function latLngToTile(lat, lon, zoom) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x, y, z: zoom };
}

export function generateTileUrlsForArea(lat, lon, zoomLevels = [14, 15, 16], radiusTiles = 1) {
  if (!lat || !lon) return [];
  const urls = [];
  zoomLevels.forEach((z) => {
    const center = latLngToTile(lat, lon, z);
    for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
      for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const sub = Math.abs(x + y) % 4;
        urls.push(`https://mt${sub}.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`);
        urls.push(`https://mt${sub}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`);
      }
    }
  });
  return Array.from(new Set(urls));
}

