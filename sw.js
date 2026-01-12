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

let deferredPrompt;
const installBar = document.getElementById('install-bar');
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    // ব্রাউজারের ডিফল্ট পপ-আপ বন্ধ করা
    e.preventDefault();
    // ইভেন্টটি সেভ করে রাখা
    deferredPrompt = e;
    // আমাদের কাস্টম ইনস্টল বারটি দেখানো
    installBar.style.transform = "translateY(0)";
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // ইনস্টল প্রম্পট দেখানো
        deferredPrompt.prompt();
        // ব্যবহারকারী কি ক্লিক করলো তা চেক করা
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install: ${outcome}`);
        // কাজ শেষ, তাই প্রম্পট ক্লিয়ার করা
        deferredPrompt = null;
        // আমাদের বারটি লুকিয়ে ফেলা
        hideInstallBar();
    }
});

function hideInstallBar() {
    installBar.style.transform = "translateY(160px)";
}

// একবার ইনস্টল হয়ে গেলে বারটি আর দেখাবে না
window.addEventListener('appinstalled', () => {
    console.log('App successfully installed');
    hideInstallBar();
});
