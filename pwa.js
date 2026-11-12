
(() => {
  'use strict';

  if (window.KBH_PWA_INITIALIZED) return;
  window.KBH_PWA_INITIALIZED = true;

  let deferredPrompt = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function showPopup() {
    const popup = getElement('installPopup');

    if (popup && !isInstalled()) {
      popup.style.display = 'flex';
    }
  }

  function hidePopup() {
    const popup = getElement('installPopup');

    if (popup) popup.style.display = 'none';
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('KBH SW active:', reg.scope))
      .catch(err => console.error('KBH SW error:', err));
  }

  // Receive install event
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();

    deferredPrompt = event;

    console.log('KBH: Install event received');

    const btn = getElement('installBtn');
    if (btn) btn.hidden = false;

    showPopup();
  });

  // Delegated click handler
  document.addEventListener('click', async event => {

    const installButton = event.target.closest('#installBtn');

    if (installButton) {
      console.log('KBH: Install button clicked');

      event.preventDefault();

      if (!deferredPrompt) {
        console.warn('KBH: No install prompt available');

        alert(
          'এই মুহূর্তে Install Prompt পাওয়া যাচ্ছে না। ' +
          'Chrome-এর তিন ডট মেনু থেকে Install app ব্যবহার করুন।'
        );
        return;
      }

      const installEvent = deferredPrompt;
      deferredPrompt = null;

      try {
        // Must be called directly during the user click
        const promptPromise = installEvent.prompt();

        await promptPromise;

        const result = await installEvent.userChoice;

        console.log('KBH installation result:', result.outcome);

        if (result.outcome === 'accepted') {
          hidePopup();
        }

      } catch (error) {
        console.error('KBH Install error:', error);
        alert('Install করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }

      return;
    }

    if (
      event.target.closest('#closeInstallPopup') ||
      event.target.closest('#closeInstallLater')
    ) {
      hidePopup();
    }

  }, true);

  // App installed
  window.addEventListener('appinstalled', () => {
    console.log('KBH: App installed successfully');

    deferredPrompt = null;
    hidePopup();
  });

  if (isInstalled()) {
    hidePopup();
  }

  console.log('KBH PWA script initialized');

})();
