const CACHE_NAME = "groove-gallery-cache-v1";

const STATIC_ASSETS = [
  '/groove-slider-app/',
  '/groove-slider-app/index.html',
  '/groove-slider-app/manifest.json',
  '/groove-slider-app/icons/icon-192.png',
  '/groove-slider-app/icons/icon-512.png',
  'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.js', // Add FFmpeg JS core
  'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm', // Add FFmpeg WebAssembly file
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
          if (event.request.url.includes('/assets/')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => caches.match('/groove-slider-app/index.html')) // Offline fallback
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
