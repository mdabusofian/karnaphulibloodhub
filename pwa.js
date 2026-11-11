
'use strict';

let deferredPrompt = null;

const popup = document.getElementById('installPopup');
const installBtn = document.getElementById('installBtn');
const closeBtn = document.getElementById('closeInstallPopup');
const laterBtn = document.getElementById('closeInstallLater');

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Show popup
function showInstallPopup() {
  if (!popup || isInstalled()) return;
  popup.style.display = 'flex';
}

// Hide popup
function hideInstallPopup() {
  if (popup) {
    popup.style.display = 'none';
  }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker error:', error);
      });
  });
}

// Chrome install event
window.addEventListener('beforeinstallprompt', event => {
  console.log('PWA install event received');

  event.preventDefault();
  deferredPrompt = event;

  showInstallPopup();
});

// Install button
if (installBtn) {
  installBtn.addEventListener('click', () => {
    console.log('Install button clicked');

    if (!deferredPrompt) {
      alert(
        'Chrome-এর Install Prompt এখন প্রস্তুত নয়। ' +
        'কিছুক্ষণ পরে আবার চেষ্টা করুন অথবা Chrome Menu থেকে Install App ব্যবহার করুন।'
      );
      return;
    }

    const installEvent = deferredPrompt;
    deferredPrompt = null;

    // Call prompt directly from the button click
    const choicePromise = installEvent.userChoice;
    installEvent.prompt();

    choicePromise.then(result => {
      console.log('Installation result:', result.outcome);

      if (result.outcome === 'accepted') {
        hideInstallPopup();
      }
    }).catch(error => {
      console.error('Installation failed:', error);
    });
  });
} else {
  console.error('Install button not found');
}

// Close button
if (closeBtn) {
  closeBtn.addEventListener('click', hideInstallPopup);
}

// Later button
if (laterBtn) {
  laterBtn.addEventListener('click', hideInstallPopup);
}

// App installed successfully
window.addEventListener('appinstalled', () => {
  console.log('Karnaphuli Blood Hub installed successfully');

  deferredPrompt = null;
  hideInstallPopup();
});

// Initial check
if (isInstalled()) {
  hideInstallPopup();
}
