(function () {
  "use strict";

  const installButton = document.getElementById("installAppButton");
  const installHelp = document.getElementById("pwaInstallHelp");
  const status = document.getElementById("pwaStatus");
  const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const androidDevice = /Android/i.test(navigator.userAgent);
  let installPrompt = null;
  let offlineReady = false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const nativeRuntime = window.location.protocol === "capacitor:" ||
    (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());

  if (nativeRuntime) {
    installButton.hidden = true;
    installHelp.textContent = "التطبيق مثبت على جهازك.";
    status.textContent = "الجدول والخرائط محفوظة داخل التطبيق ومتاحة دون اتصال بالإنترنت.";
    return;
  }

  function updateStatus() {
    if (!navigator.onLine) {
      status.textContent = offlineReady
        ? "أنت غير متصل بالإنترنت؛ الجدول والخرائط المحفوظة ما زالت متاحة."
        : "أنت غير متصل. افتح التطبيق مرة واحدة بالإنترنت ليحفظ الملفات على الجهاز.";
      return;
    }
    status.textContent = offlineReady
      ? "التطبيق جاهز أوفلاين. عند توفر الإنترنت، سيتحدّث الجدول تلقائيًا."
      : "بنجهّز حفظ الجدول والخرائط على جهازك للاستخدام دون إنترنت.";
  }

  if (standalone) {
    installButton.hidden = true;
    installHelp.textContent = "التطبيق مثبت على جهازك.";
  }

  installButton.addEventListener("click", function () {
    if (installPrompt) {
      installPrompt.prompt().then(function () {
        return installPrompt.userChoice;
      }).then(function (choice) {
        installHelp.textContent = choice && choice.outcome === "accepted"
          ? "بدأ تثبيت التطبيق على جهازك."
          : "تقدر تثبته لاحقًا من قائمة المتصفح.";
        installPrompt = null;
      }).catch(function () {
        installHelp.textContent = "افتح قائمة المتصفح واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».";
      });
      return;
    }

    if (iosDevice) {
      installHelp.textContent = "على iPhone أو iPad: افتح الصفحة في Safari، اضغط زر المشاركة، ثم اختار «إضافة إلى الشاشة الرئيسية».";
    } else if (androidDevice) {
      installHelp.textContent = "افتح قائمة المتصفح ⋮ واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».";
    } else {
      installHelp.textContent = "للتثبيت، افتح الرابط في Chrome أو Edge واختار «تثبيت التطبيق» من قائمة المتصفح.";
    }
  });

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    installButton.hidden = true;
    installHelp.textContent = "تم تثبيت التطبيق على جهازك.";
  });

  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    status.textContent = "التشغيل أوفلاين والتثبيت يحتاجان فتح النسخة من رابط HTTPS.";
    return;
  }

  navigator.serviceWorker.register("./service-worker.js")
    .then(function (registration) {
      if (registration.installing) {
        registration.installing.addEventListener("statechange", function (event) {
          if (event.target.state === "redundant") {
            status.textContent = "تعذر حفظ ملفات التطبيق. افتح الصفحة باتصال ثابت بالإنترنت وحاول مرة أخرى.";
          }
        });
      }
      return navigator.serviceWorker.ready;
    })
    .then(function () {
      offlineReady = true;
      updateStatus();
    })
    .catch(function () {
      status.textContent = "تعذر تجهيز التخزين أوفلاين في هذا المتصفح. افتح الصفحة من جديد مع اتصال بالإنترنت.";
    });

  updateStatus();
})();
