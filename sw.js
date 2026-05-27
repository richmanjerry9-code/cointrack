const CACHE = 'cointrack-v3';
const APP_FILES = ['/', '/index.html', '/css.js'];

// INSTALL — cache app files fresh
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

// ACTIVATE — delete ALL old caches so phone never serves stale files
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => clients.claim()) // take control of all open tabs immediately
  );
});

// FETCH — network first for app files, cache fallback for offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for HTML and JS app files — never serve stale
  const isAppFile = APP_FILES.includes(url.pathname) || url.pathname === '/index.html';

  if (isAppFile) {
    e.respondWith(
      fetch(e.request)
        .then(networkRes => {
          // Update cache with fresh copy
          const clone = networkRes.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return networkRes;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // For everything else (fonts, Firebase SDK, etc.) — cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});