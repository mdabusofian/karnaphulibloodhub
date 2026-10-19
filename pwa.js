/* Karnaphuli Blood Hub — PWA helper: service worker + ইনস্টল পপআপ */
(function () {
  'use strict';
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferred = null, shown = false;
  window.kbhCanInstall = function () { return !!deferred; };
  window.kbhInstall = function () {
    if (!deferred) return Promise.resolve(false);
    deferred.prompt();
    return deferred.userChoice.then(function (c) { deferred = null; return c && c.outcome === 'accepted'; });
  };

  var KEY = 'kbhInstallHide', DAYS = 3;
  function hidden() { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < DAYS * 864e5; } catch (_) { return false; } }
  function hide() { try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {} }
  function close() { var p = document.getElementById('kbh-pop'); if (p) p.remove(); }

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var iosSafari = isIOS && !/crios|fxios|edgios/i.test(ua);
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Snapchat|TikTok/i.test(ua);
  var android = /android/i.test(ua);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    document.dispatchEvent(new Event('kbh-install-ready'));
    if (canShow()) popup('install');
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; close(); hide();
    document.dispatchEvent(new Event('kbh-installed'));
  });

  function canShow() { return !standalone && !shown && !hidden() && !/(admin|download)(\.html)?$/.test(location.pathname); }

  function el(tag, css, txt) { var n = document.createElement(tag); if (css) n.style.cssText = css; if (txt) n.textContent = txt; return n; }
  var F = 'font-family:"Hind Siliguri",system-ui,sans-serif;';

  // kind: install (এক ট্যাপে), ios, manual (Android মেনু), inapp (ফেসবুক/মেসেঞ্জারের ব্রাউজার)
  function popup(kind) {
    if (shown || document.getElementById('kbh-pop')) return;
    shown = true;
    var ov = el('div', 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;padding:16px;' + F);
    ov.id = 'kbh-pop'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'অ্যাপ ইনস্টল');
    var box = el('div', 'background:#fff;color:#1f1f23;width:100%;max-width:440px;border-radius:28px;padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 30px 60px -20px rgba(0,0,0,.5);text-align:center;');
    var img = el('img', 'width:68px;height:68px;border-radius:18px;display:block;margin:0 auto 12px;box-shadow:0 14px 24px -12px rgba(225,29,46,.8)');
    img.src = 'icons/icon-192.png'; img.alt = ''; img.width = 68; img.height = 68;
    var h = el('div', 'font-weight:700;font-size:20px;line-height:1.35', 'ফোনে অ্যাপ হিসেবে রাখুন');
    var msg = {
      install: 'ইনস্টল করলে হোম স্ক্রিন থেকে এক ট্যাপে খুলবে। জরুরি মুহূর্তে ডোনার খুঁজতে দেরি হবে না।',
      ios: 'নিচের Share বাটন (□↑) চেপে “Add to Home Screen” বেছে নিন, তারপর Add চাপুন।',
      manual: 'Chrome-এর ডান উপরের ⋮ মেনু চেপে “Install app” বা “Add to Home screen” বেছে নিন।',
      inapp: 'ইনস্টল করতে লিংকটি Chrome (Android) বা Safari (iPhone)-তে খুলুন। উপরের ⋮ মেনু থেকে “Open in browser” বেছে নিন।'
    }[kind];
    var p = el('div', 'color:#6b6b76;font-size:15.5px;line-height:1.6;margin:6px 0 16px', msg);
    var row = el('div', 'display:flex;gap:10px');
    var later = el('button', 'flex:1;padding:13px;border-radius:14px;border:2px solid #fde1e4;background:#fff;color:#e11d2e;font:700 16px/1 "Hind Siliguri",system-ui,sans-serif;cursor:pointer', 'পরে');
    later.type = 'button'; later.onclick = function () { hide(); close(); };
    row.appendChild(later);
    if (kind === 'install') {
      var go = el('button', 'flex:1.4;padding:13px;border-radius:14px;border:0;background:linear-gradient(135deg,#ff5a64,#e11d2e);color:#fff;font:700 16px/1 "Hind Siliguri",system-ui,sans-serif;cursor:pointer;box-shadow:0 14px 24px -12px rgba(225,29,46,.8)', 'ইনস্টল করুন');
      go.type = 'button'; go.onclick = function () { window.kbhInstall().then(function (ok) { close(); if (!ok) hide(); }); };
      row.appendChild(go);
    } else if (kind === 'inapp' && navigator.clipboard) {
      var cp = el('button', 'flex:1.4;padding:13px;border-radius:14px;border:0;background:#e11d2e;color:#fff;font:700 16px/1 "Hind Siliguri",system-ui,sans-serif;cursor:pointer', 'লিংক কপি করুন');
      cp.type = 'button'; cp.onclick = function () { navigator.clipboard.writeText(location.origin + '/').then(function () { cp.textContent = 'কপি হয়েছে ✓'; }); };
      row.appendChild(cp);
    }
    box.appendChild(img); box.appendChild(h); box.appendChild(p); box.appendChild(row);
    ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) { hide(); close(); } });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { hide(); close(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(ov);
    later.focus();
  }

  // যেসব ব্রাউজারে beforeinstallprompt আসে না, সেখানে ম্যানুয়াল নির্দেশনা
  window.addEventListener('load', function () {
    if (!canShow()) return;
    setTimeout(function () {
      if (!canShow() || deferred) return;
      if (inApp) popup('inapp');
      else if (iosSafari) popup('ios');
      else if (android) popup('manual');
    }, 3500);
  });
})();
