const CACHE_VERSION = 'v8';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const CURRENT_CACHES = new Set([STATIC_CACHE, API_CACHE, IMAGE_CACHE]);

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                (name.startsWith('static-') || name.startsWith('api-') || name.startsWith('images-')) &&
                !CURRENT_CACHES.has(name)
              );
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => {
          const url = new URL(client.url);
          if (url.pathname.startsWith('/admin') && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/admin')) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  if (
    url.pathname.startsWith('/assets/') ||
    ['script', 'style', 'font', 'worker'].includes(request.destination)
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
  }
});

async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse =
      (await caches.match('/index.html')) ||
      (await caches.match('/'));

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Offline - App shell is not cached yet', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - No cached data available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Failed to load image', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse || new Response('Offline - No cached data available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    }));

  return cachedResponse || fetchPromise;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.message || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'eSIM Marketplace', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
