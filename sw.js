
/* Karnaphuli Blood Hub - Fixed PWA Service Worker */
'use strict';

const CACHE_NAME = 'kbh-pwa-v4';

const APP_SHELL = [
  './',
  './index.html',
  './about.html',
  './all-donors.html',
  './application-status.html',
  './blood_requests.html',
  './donor-registration.html',
  './donor_registration.html',
  './download.html',
  './verify-donor.html',
  './admin.html',
  './manifest.webmanifest',
  './pwa.js'
];

const ICON_PATHS = [
  './icons/favicon-48.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

function isValidPNG(response) {
  return (
    response &&
    response.ok &&
    response.headers.get('content-type')?.toLowerCase().includes('image/png')
  );
}

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(APP_SHELL);

      // Cache only actual PNG images
      for (const path of ICON_PATHS) {
        try {
          const url = new URL(path, self.registration.scope);
          const response = await fetch(url, { cache: 'reload' });

          if (isValidPNG(response)) {
            await cache.put(url, response.clone());
          }
        } catch (error) {
          console.warn('Icon cache skipped:', path, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

// Activate and remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('kbh-pwa-') &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Icons: Network first, accept PNG only
  if (url.pathname.includes('/icons/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request, {
            cache: 'no-store'
          });

          if (isValidPNG(response)) {
            await cache.put(request, response.clone());
            return response;
          }
        } catch (error) {
          console.warn('Icon network failed:', error);
        }

        const cached = await cache.match(request);

        if (isValidPNG(cached)) {
          return cached;
        }

        return new Response('Icon not found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      })()
    );

    return;
  }

  // HTML navigation: Network first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          return (
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            Response.error()
          );
        }
      })()
    );

    return;
  }

  // Other assets: Cache first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      const response = await fetch(request);

      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })()
  );
});
