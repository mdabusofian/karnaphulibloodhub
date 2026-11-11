
(() => {
  'use strict';

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

  function hidePopup() {
    if (popup) popup.style.display = 'none';
  }

  function showPopup() {
    if (popup && !isInstalled()) {
      popup.style.display = 'flex';
    }
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('KBH SW active:', reg.scope))
      .catch(err => console.error('KBH SW error:', err));
  }

  // Receive native install event
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();

    deferredPrompt = event;

    console.log('KBH: Install event received');

    if (installBtn) installBtn.hidden = false;

    showPopup();
  });

  // Install button click
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      console.log('KBH: Install button clicked');

      if (!deferredPrompt) {
        alert('Install Prompt এখন পাওয়া যাচ্ছে না। পেজ Refresh করে আবার চেষ্টা করুন।');
        return;
      }

      const installEvent = deferredPrompt;
      deferredPrompt = null;

      // Call prompt directly inside the click event
      try {
        const promptPromise = installEvent.prompt();

        promptPromise.then(async () => {
          const result = await installEvent.userChoice;

          console.log('KBH installation result:', result.outcome);

          if (result.outcome === 'accepted') {
            hidePopup();
          }
        }).catch(error => {
          console.error('KBH Install error:', error);
        });

      } catch (error) {
        console.error('KBH Install error:', error);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', hidePopup);
  }

  if (laterBtn) {
    laterBtn.addEventListener('click', hidePopup);
  }

  window.addEventListener('appinstalled', () => {
    console.log('KBH: App installed successfully');
    deferredPrompt = null;
    hidePopup();
  });

  if (isInstalled()) hidePopup();

})();
