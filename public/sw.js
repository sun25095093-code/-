const CACHE_NAME = 'gaegul-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for index.html and JS assets to prevent blank screens after new deployments
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // If it's one of our dynamic PNG icons, always try cache FIRST (since they only exist in cache)
  if (url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png' || url.pathname === '/apple-touch-icon.png') {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not cached yet, fallback to fetching /icon.svg so it displays something instead of a 404!
        return fetch('/icon.svg');
      })
    );
    return;
  }
  
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.startsWith('/assets/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
  }
});
