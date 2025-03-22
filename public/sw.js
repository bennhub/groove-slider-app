const CACHE_NAME = "groove-gallery-cache-v1";

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache FFmpeg files and app assets
          if (event.request.url.includes('/assets/') || 
              event.request.url.includes('@ffmpeg/core')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => caches.match('/index.html')) // Offline fallback
  );
});

// Clear old caches when a new version is activated
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});