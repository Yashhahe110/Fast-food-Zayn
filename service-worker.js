/* =========================================================
   service-worker.js — Offline cache for Zayn POS
   ========================================================= */
const CACHE_NAME = 'zayan-pos-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/responsive.css',
  './js/storage.js',
  './js/products.js',
  './js/categories.js',
  './js/cart.js',
  './js/receipt.js',
  './js/order-editor.js',
  './js/dashboard.js',
  './js/login.js',
  './js/app.js',
  './data/products-data.js',
  './data/products.json',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
