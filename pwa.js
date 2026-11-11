
let deferredInstallPrompt = null;

const installBtn = document.getElementById("installBtn");
const pwaText = document.getElementById("pwaText");

// Service Worker চালু
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
      console.log("PWA Service Worker registered");
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}

// আগে থেকেই ইনস্টল করা আছে কি না
function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

if (isAppInstalled()) {
  if (installBtn) installBtn.hidden = true;
  if (pwaText) pwaText.textContent = "অ্যাপটি ইতোমধ্যে ইনস্টল করা আছে";
}

// Android / Chrome Install Prompt
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (installBtn && !isAppInstalled()) {
    installBtn.hidden = false;
    installBtn.textContent = "Install App";
  }

  if (pwaText) {
    pwaText.textContent = "এক ক্লিকেই অ্যাপটি ইনস্টল করুন";
  }
});

// Install Button
if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    if (result.outcome === "accepted") {
      installBtn.hidden = true;
      if (pwaText) {
        pwaText.textContent = "ইনস্টল সম্পন্ন হলে অ্যাপ খুলুন";
      }
    }

    deferredInstallPrompt = null;
  });
}

// ইনস্টল সম্পন্ন হলে
window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.hidden = true;

  if (pwaText) {
    pwaText.textContent = "অ্যাপটি সফলভাবে ইনস্টল হয়েছে";
  }

  deferredInstallPrompt = null;
});

// iPhone / iPad নির্দেশনা
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

if (isIOS && !isAppInstalled()) {
  if (pwaText) {
    pwaText.textContent =
      "Safari-এর Share মেনু থেকে Add to Home Screen নির্বাচন করুন";
  }
}
