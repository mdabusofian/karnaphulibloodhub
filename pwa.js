/* Karnaphuli Blood Hub — PWA helper: service worker + ইনস্টল ব্যানার */
(function () {
  'use strict';
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferred = null;
  window.kbhCanInstall = function () { return !!deferred; };
  window.kbhInstall = function () {
    if (!deferred) return Promise.resolve(false);
    deferred.prompt();
    return deferred.userChoice.then(function (c) { deferred = null; return c && c.outcome === 'accepted'; });
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    document.dispatchEvent(new Event('kbh-install-ready'));
    if (!hidden()) banner(false);
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; remove();
    document.dispatchEvent(new Event('kbh-installed'));
  });

  var KEY = 'kbhInstallHide';
  function hidden() { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch (_) { return false; } }
  function hide() { try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {} }
  function remove() { var b = document.getElementById('kbh-ib'); if (b) b.remove(); }

  var skip = standalone || /(admin|download)\.html$/.test(location.pathname);
  if (skip) return;

  function banner(ios) {
    if (document.getElementById('kbh-ib')) return;
    var hasNav = !!document.querySelector('body > nav');
    var b = document.createElement('div');
    b.id = 'kbh-ib';
    b.setAttribute('role', 'region');
    b.setAttribute('aria-label', 'অ্যাপ ইনস্টল');
    b.style.cssText = 'position:fixed;left:16px;right:16px;z-index:55;max-width:448px;margin:0 auto;' +
      'bottom:calc(' + (hasNav ? '84px' : '16px') + ' + env(safe-area-inset-bottom,0px));' +
      'background:#fff;color:#1f1f23;border:1px solid #fde1e4;border-radius:18px;padding:12px 12px 12px 14px;' +
      'display:flex;align-items:center;gap:10px;font:600 14px/1.4 "Hind Siliguri",system-ui,sans-serif;' +
      'box-shadow:0 18px 34px -16px rgba(225,29,46,.55)';
    var img = document.createElement('img');
    img.src = 'icons/icon-192.png'; img.alt = ''; img.width = 40; img.height = 40;
    img.style.cssText = 'border-radius:11px;flex:none';
    var t = document.createElement('div');
    t.style.cssText = 'flex:1;min-width:0';
    t.textContent = ios
      ? 'iPhone-এ অ্যাপ হিসেবে রাখতে Safari-র Share বাটন চেপে “Add to Home Screen” বেছে নিন।'
      : 'হোম স্ক্রিনে ইনস্টল করে অ্যাপের মতো ব্যবহার করুন।';
    b.appendChild(img); b.appendChild(t);
    if (!ios) {
      var i = document.createElement('button');
      i.type = 'button'; i.textContent = 'ইনস্টল';
      i.style.cssText = 'background:#e11d2e;color:#fff;border:0;border-radius:12px;padding:9px 14px;font:700 14px "Hind Siliguri",system-ui,sans-serif;cursor:pointer;flex:none';
      i.onclick = function () { window.kbhInstall().then(remove); };
      b.appendChild(i);
    }
    var x = document.createElement('button');
    x.type = 'button'; x.setAttribute('aria-label', 'বন্ধ করুন'); x.textContent = '✕';
    x.style.cssText = 'background:#fff0f1;color:#e11d2e;border:0;border-radius:50%;width:34px;height:34px;font:700 15px system-ui;cursor:pointer;flex:none';
    x.onclick = function () { hide(); remove(); };
    b.appendChild(x);
    document.body.appendChild(b);
  }

  var ua = navigator.userAgent || '';
  var ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
  if (ios && !hidden()) setTimeout(function () { banner(true); }, 3500);
})();
