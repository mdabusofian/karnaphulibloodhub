/* Karnaphuli Blood Hub — service worker
 * - পেজ: network-first (অনলাইনে সবসময় নতুন), অফলাইনে সেভ করা কপি
 * - ডোনার তালিকা (Apps Script GET ?sheet=Donors): network-first, অফলাইনে শেষ কপি
 * - রক্তের অনুরোধ (?sheet=Requests): কখনো ক্যাশ হয় না (পুরনো অনুরোধ দেখানো বিপজ্জনক)
 * - admin.html ও সব POST: কখনো ক্যাশ হয় না
 * নতুন ভার্সন ডেপ্লয় করলে V বদলান।
 */
const V = 'kbh-v1';
const PAGES = V + '-pages';
const EXT = V + '-ext';
const DATA = V + '-data';
const SHELL = [
  './', 'index.html', 'home.html', 'all-donors.html', 'blood_requests.html',
  'donor_registration.html', 'about.html', 'download.html',
  'pwa.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(PAGES);
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [PAGES, EXT, DATA];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const withTimeout = (p, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout')), ms);
  p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
});

async function pageStrategy(req, url) {
  const key = url.origin + url.pathname;          // query বাদ দিয়ে এক কপি
  const cache = await caches.open(PAGES);
  try {
    const net = await withTimeout(fetch(req), 4000);
    if (net && net.ok) cache.put(key, net.clone());
    return net;
  } catch (_) {
    return (await cache.match(key)) || (await cache.match('index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetching = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await fetching) || Response.error();
}

async function donorsStrategy(req) {
  const cache = await caches.open(DATA);
  try {
    const net = await withTimeout(fetch(req), 15000);
    if (net && net.ok) cache.put(req.url, net.clone());
    return net;
  } catch (_) {
    return (await cache.match(req.url)) || Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Apps Script API
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) {
    if (url.searchParams.get('sheet') === 'Donors') e.respondWith(donorsStrategy(req));
    return; // Requests ও বাকি সব সরাসরি নেটওয়ার্কে
  }

  // একই সাইট
  if (url.origin === location.origin) {
    if (/\/admin\.html$/.test(url.pathname)) return;  // অ্যাডমিন কখনো ক্যাশ নয়
    if (req.mode === 'navigate' || /\.html$/.test(url.pathname) || url.pathname.endsWith('/')) {
      e.respondWith(pageStrategy(req, url));
    } else {
      e.respondWith(staleWhileRevalidate(req, PAGES));
    }
    return;
  }

  // ফন্ট ও QR লাইব্রেরি
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req, EXT));
  }
});
