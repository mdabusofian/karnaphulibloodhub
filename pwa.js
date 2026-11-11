/* Karnaphuli Blood Hub PWA bootstrap */
(function () {
  'use strict';
  let deferredPrompt = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  window.kbhCanInstall = () => !!deferredPrompt && !standalone();
  window.kbhInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.dispatchEvent(new Event('kbh-install-ready'));
    if (choice && choice.outcome === 'accepted') document.dispatchEvent(new Event('kbh-installed'));
    return !!choice && choice.outcome === 'accepted';
  };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    document.dispatchEvent(new Event('kbh-install-ready'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.dispatchEvent(new Event('kbh-installed'));
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
        console.warn('KBH service worker registration failed:', error);
      });
    });
  }
})();
