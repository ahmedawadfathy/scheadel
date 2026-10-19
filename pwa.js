(function () {
  "use strict";
  const installButton = document.getElementById("installAppButton");
  const installHelp = document.getElementById("pwaInstallHelp");
  const status = document.getElementById("pwaStatus");
  const setStatus = message => { if (status) status.textContent = message; };
  const setInstallHelp = message => { if (installHelp) installHelp.textContent = message; };
  const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const androidDevice = /Android/i.test(navigator.userAgent);
  let installPrompt = null;
  let offlineReady = false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const nativeRuntime = window.location.protocol === "capacitor:" || (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
  if (nativeRuntime) {
    if (installButton) installButton.hidden = true;
    setInstallHelp("التطبيق مثبت على جهازك.");
    setStatus("الجدول والخرائط محفوظة داخل التطبيق ومتاحة دون اتصال بالإنترنت.");
    return;
  }
  function updateStatus() {
    if (!navigator.onLine) {
      setStatus(offlineReady ? "أنت غير متصل بالإنترنت؛ الجدول والخرائط المحفوظة ما زالت متاحة." : "أنت غير متصل. افتح الصفحة مرة واحدة بالإنترنت ليحفظ الملفات على الجهاز.");
      return;
    }
    setStatus(offlineReady ? "التخزين المحلي جاهز. عند توفر الإنترنت، سيتحدّث الجدول تلقائيًا." : "بنجهّز حفظ ملفات الجدول على جهازك للاستخدام دون اتصال.");
  }
  if (standalone) {
    if (installButton) installButton.hidden = true;
    setInstallHelp("التطبيق مثبت على جهازك.");
  }
  if (installButton) installButton.addEventListener("click", function () {
    if (installPrompt) {
      installPrompt.prompt().then(function () { return installPrompt.userChoice; }).then(function (choice) {
        setInstallHelp(choice && choice.outcome === "accepted" ? "بدأ تثبيت التطبيق على جهازك." : "تقدر تثبته لاحقًا من قائمة المتصفح.");
        installPrompt = null;
      }).catch(function () { setInstallHelp("افتح قائمة المتصفح واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."); });
      return;
    }
    if (iosDevice) setInstallHelp("على iPhone أو iPad: افتح الصفحة في Safari، اضغط زر المشاركة، ثم اختار «إضافة إلى الشاشة الرئيسية».");
    else if (androidDevice) setInstallHelp("افتح قائمة المتصفح ⋮ واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
    else setInstallHelp("للتثبيت، افتح الصفحة في Chrome أو Edge واختار «تثبيت التطبيق» من قائمة المتصفح.");
  });
  window.addEventListener("beforeinstallprompt", function (event) {
    if (!installButton) return;
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    setInstallHelp("تم تثبيت التطبيق على جهازك.");
  });
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    setStatus("التخزين أوفلاين يحتاج فتح النسخة من رابط HTTPS.");
    return;
  }
  navigator.serviceWorker.register("./service-worker.js").then(function (registration) {
    if (registration.installing) registration.installing.addEventListener("statechange", function (event) {
      if (event.target.state === "redundant") setStatus("تعذر حفظ ملفات التطبيق. افتح الصفحة باتصال ثابت بالإنترنت وحاول مرة أخرى.");
    });
    return navigator.serviceWorker.ready;
  }).then(function () {
    offlineReady = true;
    updateStatus();
  }).catch(function () {
    setStatus("تعذر تجهيز التخزين أوفلاين في هذا المتصفح. افتح الصفحة من جديد مع اتصال بالإنترنت.");
  });
  updateStatus();
})();
