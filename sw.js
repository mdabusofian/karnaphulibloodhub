
'use strict';

const CACHE_NAME = 'kbh-pwa-v6';
const APP_SHELL = [
  './',
  './index.html',
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

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache files individually so one missing file
      // cannot prevent the Service Worker from installing.
      for (const path of [...APP_SHELL, ...ICON_PATHS]) {
        try {
          const response = await fetch(path, {
            cache: 'reload'
          });

          if (!response.ok) {
            console.warn('Cache skipped:', path);
            continue;
          }

          if (
            path.includes('/icons/') &&
            !response.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('image/png')
          ) {
            console.warn('Invalid PNG skipped:', path);
            continue;
          }

          await cache.put(path, response.clone());
        } catch (error) {
          console.warn('Cache skipped:', path, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

// Activate
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

  // Icon requests
  if (url.pathname.includes('/icons/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request, {
            cache: 'no-store'
          });

          if (
            response.ok &&
            response.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('image/png')
          ) {
            await cache.put(request, response.clone());
            return response;
          }
        } catch (error) {
          console.warn('Icon network failed:', error);
        }

        const cached = await cache.match(request);

        if (cached) return cached;

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

  // HTML navigation: network first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response.ok) {
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

  // Other same-origin files: cache first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) return cached;

      const response = await fetch(request);

      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })()
  );
});
