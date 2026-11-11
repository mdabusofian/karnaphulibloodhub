
'use strict';

let deferredPrompt = null;

const popup = document.getElementById('installPopup');
const installBtn = document.getElementById('installBtn');
const closeBtn = document.getElementById('closeInstallPopup');

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function showInstallPopup() {
  if (!popup || isInstalled()) return;
  popup.style.display = 'flex';
}

function hideInstallPopup() {
  if (popup) popup.style.display = 'none';
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(error => console.error('SW error:', error));
  });
}

// Chrome Install Prompt
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;

  // Show custom popup
  showInstallPopup();
});

// Install button
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('Chrome-এর Install অপশন এখন প্রস্তুত নয়। কিছুক্ষণ পরে আবার চেষ্টা করুন।');
      return;
    }

    deferredPrompt.prompt();

    const result = await deferredPrompt.userChoice;

    if (result.outcome === 'accepted') {
      console.log('App installation accepted');
    }

    deferredPrompt = null;
    hideInstallPopup();
  });
}

// Close button
if (closeBtn) {
  closeBtn.addEventListener('click', hideInstallPopup);
}

// Installed successfully
window.addEventListener('appinstalled', () => {
  hideInstallPopup();
  deferredPrompt = null;
});

// iPhone instructions
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isInstalled()) {
  setTimeout(() => {
    showInstallPopup();
  }, 2000);
}
