
'use strict';

let deferredPrompt = null;

const popup = document.getElementById('installPopup');
const installBtn = document.getElementById('installBtn');
const closeBtn = document.getElementById('closeInstallPopup');
const laterBtn = document.getElementById('closeInstallLater');

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function showPopup() {
  if (popup && !isInstalled()) {
    popup.style.display = 'flex';
  }
}

function hidePopup() {
  if (popup) popup.style.display = 'none';
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('KBH Service Worker active:', registration.scope);
    } catch (error) {
      console.error('Service Worker error:', error);
    }
  });
}

// Chrome install event
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();

  deferredPrompt = event;

  console.log('KBH: Install event received');

  if (!isInstalled()) showPopup();
});

// Install button
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    console.log('KBH: Install button clicked');

    if (!deferredPrompt) {
      alert(
        'Chrome-এর Install Prompt এখন পাওয়া যাচ্ছে না। ' +
        'পেজটি Refresh করে আবার চেষ্টা করুন।'
      );
      return;
    }

    const promptEvent = deferredPrompt;
    deferredPrompt = null;

    try {
      await promptEvent.prompt();

      const result = await promptEvent.userChoice;

      console.log('KBH installation result:', result.outcome);

      if (result.outcome === 'accepted') {
        hidePopup();
      } else {
        console.log('User cancelled installation');
      }
    } catch (error) {
      console.error('KBH install error:', error);
      alert('ইনস্টল করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  });
} else {
  console.error('KBH: installBtn not found');
}

// Close popup
if (closeBtn) {
  closeBtn.addEventListener('click', hidePopup);
}

if (laterBtn) {
  laterBtn.addEventListener('click', hidePopup);
}

// Successfully installed
window.addEventListener('appinstalled', () => {
  console.log('KBH: App installed successfully');
  deferredPrompt = null;
  hidePopup();
});

// Already installed
if (isInstalled()) {
  hidePopup();
}
