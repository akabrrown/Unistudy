// UniStudy Service Worker v1.0.0
const CACHE_NAME = 'unistudy-pwa-v1.0.0';

const PRECACHE_ASSETS = [
  '/offline',
  '/favicon.svg',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
  '/brand/logo-icon.png',
  '/brand/logo-primary.svg',
];

// Install: precache critical assets & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Precache failed:', err);
      })
  );
});

// Activate: purge stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event: smart network-first navigation & cache-first static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch with a 3.5s timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const networkResponse = await fetch(request, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(() => {});
          }

          return networkResponse;
        } catch (error) {
          // Network failed or timed out — search cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // If navigation not in cache, fallback to offline screen
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <title>Offline — UniStudy</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; background: #00004E; color: #FFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                  .box { max-width: 420px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(0,0,0,0.2); }
                  h1 { font-size: 20px; color: #D89A06; }
                  p { font-size: 14px; opacity: 0.8; line-height: 1.5; }
                  button { margin-top: 16px; background: #D89A06; color: #00004E; border: none; font-weight: bold; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="box">
                  <h1>You're Offline</h1>
                  <p>UniStudy could not connect to the network. Please check your internet connection.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' },
              status: 503,
            }
          );
        }
      })()
    );
    return;
  }

  // 2. Static Next.js chunks, fonts, and local images (Stale-While-Revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. API endpoints: Network-first, with fallback to cache if available
  if (url.pathname.startsWith('/api/')) {
    // Never cache mutations
    if (request.method !== 'GET') return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});

// Client messaging
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
