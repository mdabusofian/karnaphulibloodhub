const CACHE_NAME = 'kbh-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './donors.html',
  './registration.html',
  './manifest.json',
  './icon-512.png'
];

// সার্ভিস ওয়ার্কার ইনস্টল করা এবং ফাইল ক্যাশে রাখা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// নেটওয়ার্ক থেকে ডাটা আনা, না পেলে ক্যাশে চেক করা
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// পুরাতন ক্যাশে ডিলিট করা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});