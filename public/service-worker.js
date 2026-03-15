// ─── Fynd Service Worker ──────────────────────────────────────────────────────
// Responsibilities:
//   • Cache static assets (CSS, JS, icons, fonts)
//   • Provide offline fallback UI
//   • Enable PWA installability
//
// NOT cached:
//   • Google Maps tiles
//   • Navigation routes
//   • User session tokens
//   • Firebase/Firestore real-time data

const CACHE_VERSION = 'fynd-pwa-v6';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core shell files cached on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/favicon.ico',
];

// URL patterns that must NEVER be served from cache
const NO_CACHE_PATTERNS = [
  /maps\.googleapis\.com\/maps\/api\/staticmap/,  // map tiles
  /maps\.googleapis\.com\/maps\/api\/directions/, // navigation routes
  /maps\.googleapis\.com\/maps\/api\/place\/nearbysearch/, // real-time nearby
  /firestore\.googleapis\.com/,                   // Firestore real-time
  /identitytoolkit\.googleapis\.com/,             // Firebase Auth sessions
  /securetoken\.googleapis\.com/,                 // session tokens
  /firebase\.googleapis\.com/,                    // Firebase services
  /\.worker\.dev\/api\/places\/nearbysearch/,     // proxy real-time nearby
];

// ── Install: precache core shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // If some precache assets are missing (dev mode), continue anyway
      });
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: purge stale cache versions ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: serve from cache or network ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip requests that must never be cached
  if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      )
    );
    return;
  }

  // Navigation requests (HTML pages): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest shell
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline: serve the cached shell
          caches.match('/').then((cached) => {
            if (cached) return cached;
            return new Response(
              '<!doctype html><html><head><meta charset="utf-8"><title>Fynd — Offline</title>' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;' +
              'justify-content:center;min-height:100dvh;margin:0;background:#0A0A0A;color:#fff;text-align:center}' +
              'h2{font-size:22px;margin-bottom:12px}p{color:#9CA3AF;font-size:14px}</style></head>' +
              '<body><div><h2>You\'re offline</h2>' +
              '<p>Check your connection and try again.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          })
        )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): cache-first
  const isStaticAsset =
    request.destination === 'style'  ||
    request.destination === 'script' ||
    request.destination === 'font'   ||
    request.destination === 'image'  ||
    /\.(css|js|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp)(\?|$)/.test(request.url);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Place search API via Cloudflare proxy: cache results for 10 minutes
  const isPlaceSearch =
    /\.worker\.dev\/api\/places\/textsearch/.test(request.url) ||
    /\.worker\.dev\/api\/places\/autocomplete/.test(request.url);

  if (isPlaceSearch) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
              // Expire cache entry after 10 minutes by scheduling deletion
              setTimeout(() => cache.delete(request), 10 * 60 * 1000);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r || new Response('', { status: 503 })))
  );
});
