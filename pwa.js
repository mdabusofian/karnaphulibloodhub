
'use strict';

let deferredPrompt = null;

const popup = document.getElementById('installPopup');
const installBtn = document.getElementById('installBtn');
const closeBtn = document.getElementById('closeInstallPopup');

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

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker registered'))
    .catch(error => console.error('Service Worker:', error));
}

// Chrome install event
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('Install event received');

  event.preventDefault();
  deferredPrompt = event;

  showPopup();
});

// Install button
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    console.log('Install button clicked');

    if (!deferredPrompt) {
      alert('Chrome এখনো Install Prompt দেয়নি। Chrome-এর তিন ডট মেনু থেকে Install App অপশন ব্যবহার করো।');
      return;
    }

    const promptEvent = deferredPrompt;
    deferredPrompt = null;

    try {
      await promptEvent.prompt();

      const result = await promptEvent.userChoice;

      console.log('Install result:', result.outcome);

      if (result.outcome === 'accepted') {
        hidePopup();
      }
    } catch (error) {
      console.error('Install error:', error);
      alert('Install করতে সমস্যা হয়েছে। আবার চেষ্টা করো।');
    }
  });
} else {
  console.error('Install button not found');
}

// Close button
if (closeBtn) {
  closeBtn.addEventListener('click', hidePopup);
}

// App installed
window.addEventListener('appinstalled', () => {
  console.log('App successfully installed');
  hidePopup();
  deferredPrompt = null;
});
