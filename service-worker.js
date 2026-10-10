"use strict";

const CACHE_NAME = "scheadel-offline-20261010-v2";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/app-icon.svg",
  "./pwa.css",
  "./course-planner.css",
  "./trial-enhancements.css",
  "./course-planner.js",
  "./trial-enhancements.js",
  "./pwa.js",
  "./assets/map-ground.jpeg",
  "./assets/map-floor-1.jpeg",
  "./assets/map-floor-2.jpeg",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/app-icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf("scheadel-offline-") === 0 && name !== CACHE_NAME) {
          return caches.delete(name);
        }
        return Promise.resolve(false);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const appScope = new URL(self.registration.scope);
  if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(appScope.href)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          return caches.open(CACHE_NAME).then(function (cache) {
            return cache.put(request, response.clone()).catch(function () {});
          }).then(function () { return response; });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (savedPage) {
          if (savedPage) return savedPage;
          return caches.match(new URL("./index.html", appScope).href);
        });
      })
    );
    return;
  }

  const updatedNetworkFile = fetch(request).then(function (response) {
    if (!response || !response.ok) return response;
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.put(request, response.clone()).catch(function () {});
    }).then(function () { return response; });
  });

  event.waitUntil(updatedNetworkFile.then(function () {}, function () {}));
  event.respondWith(
    caches.match(request).then(function (savedFile) {
      if (savedFile) return savedFile;
      return updatedNetworkFile.catch(function () {
        return new Response("الملف غير متاح دون اتصال.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      });
    })
  );
});
