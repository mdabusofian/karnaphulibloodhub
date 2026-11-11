
(() => {
  'use strict';

  // Prevent duplicate initialization
  if (window.KBH_PWA_INITIALIZED) return;
  window.KBH_PWA_INITIALIZED = true;

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
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('KBH SW active:', reg.scope))
      .catch(err => console.error('KBH SW error:', err));
  }

  // Receive Chrome install event
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;

    console.log('KBH: Install event received');

    showPopup();
  });

  // Install button
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      console.log('KBH: Install button clicked');

      if (!deferredPrompt) {
        alert('Chrome Install Prompt এখন প্রস্তুত নয়। পেজ Refresh করে আবার চেষ্টা করুন।');
        return;
      }

      const promptEvent = deferredPrompt;
      deferredPrompt = null;

      try {
        await promptEvent.prompt();

        const result = await promptEvent.userChoice;

        console.log('KBH Install result:', result.outcome);

        if (result.outcome === 'accepted') {
          hidePopup();
        }
      } catch (error) {
        console.error('KBH Install error:', error);
        alert('ইনস্টল করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    });
  } else {
    console.error('KBH: Install button not found');
  }

  if (closeBtn) closeBtn.addEventListener('click', hidePopup);
  if (laterBtn) laterBtn.addEventListener('click', hidePopup);

  window.addEventListener('appinstalled', () => {
    console.log('KBH: App installed successfully');
    deferredPrompt = null;
    hidePopup();
  });

  if (isInstalled()) hidePopup();

})();
