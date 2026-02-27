

const CACHE_NAME = 'quick-orders-v4.6-fix-exports';
const DYNAMIC_CACHE = 'quick-orders-dynamic-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/react@^19.2.3/',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/@supabase/supabase-js@2',
  'https://esm.sh/jspdf@2.5.1',
  'https://esm.sh/jspdf-autotable@3.8.2'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle Supabase Storage (Cache First Strategy for Images)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Return placeholder or fail gracefully
          return new Response('Image not available offline', { status: 404 });
        });
      })
    );
    return;
  }

  // Handle Navigation (SPA Routing Support)
  // Ensures that /any-route returns index.html when offline or for SPA client-side routing
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Default Strategy: Stale-While-Revalidate
  // Serve from cache immediately, then update cache from network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Silently fail if network is down
      });

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
