// public/sw.js
// Service Worker cho Schedule Couple: Thông báo đẩy, Điều hướng và Lưu bản đồ Offline (Offline Map Tile Cache)

const MAP_CACHE_NAME = 'couple-map-tiles-v2';
const MAX_MAP_TILES = 1500; // Giới hạn ~40-60MB an toàn cho điện thoại

// Xóa bớt cache cũ theo LRU khi vượt quá giới hạn
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const toDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(toDelete.map(k => cache.delete(k)));
    }
  } catch {}
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== MAP_CACHE_NAME && key.startsWith('couple-map-tiles-')) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── TỰ ĐỘNG BẮT VÀ LƯU BẢN ĐỒ VÀO BỘ NHỚ MÁY (OFFLINE TILE CACHING) ───
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Nhận diện mảnh bản đồ Google Maps Tiles, OpenStreetMap hoặc Reverse geocoding
  const isGoogleTile = url.hostname.includes('google.com') && url.pathname.includes('/vt/');
  const isOsmTile = url.hostname.includes('openstreetmap.org') || url.pathname.includes('/tile/');
  
  if (isGoogleTile || isOsmTile) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then(async (cache) => {
        // 1. Kiểm tra xem trong bộ nhớ máy đã có mảnh bản đồ này chưa (Cache First)
        const cached = await cache.match(req);
        if (cached) {
          // Nếu đang có mạng: âm thầm cập nhật bản mới nhất từ Google trong nền
          if (navigator.onLine) {
            fetch(req).then((fresh) => {
              if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
                cache.put(req, fresh.clone());
              }
            }).catch(() => {});
          }
          return cached;
        }

        // 2. Nếu máy chưa lưu: Tải từ Google rồi lưu lại vào máy
        try {
          const fresh = await fetch(req);
          if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
            cache.put(req, fresh.clone());
            // Giữ bộ nhớ máy gọn gàng
            trimCache(MAP_CACHE_NAME, MAX_MAP_TILES).catch(() => {});
          }
          return fresh;
        } catch (err) {
          // Khi hoàn toàn mất mạng (Offline): trả về cache nếu có
          if (cached) return cached;
          return new Response('', { status: 408, statusText: 'Offline Tile' });
        }
      })
    );
    return;
  }
});

// ─── NHẬN YÊU CẦU TẢI TRƯỚC BẢN ĐỒ KHU VỰC (PRE-CACHE) TỪ TAB VỊ TRÍ ───
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE_MAP_TILES' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(MAP_CACHE_NAME).then(async (cache) => {
        let savedCount = 0;
        for (const tileUrl of event.data.urls) {
          try {
            const has = await cache.match(tileUrl);
            if (!has) {
              const res = await fetch(tileUrl, { mode: 'no-cors' });
              if (res) {
                await cache.put(tileUrl, res);
                savedCount++;
              }
            }
          } catch {}
        }
        // Gửi thông báo hoàn thành lại cho tab
        if (event.source) {
          event.source.postMessage({
            type: 'PRECACHE_MAP_TILES_DONE',
            savedCount
          });
        }
      })
    );
  }
});

// ─── XỬ LÝ THÔNG BÁO ĐẨY (PUSH NOTIFICATIONS) ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;
    
    // Tìm tab app đã mở
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes(self.location.origin)) {
        matchingClient = windowClient;
        break;
      }
    }
    
    // Nếu có tab thì focus lại tab đó, nếu không thì mở app mới
    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
