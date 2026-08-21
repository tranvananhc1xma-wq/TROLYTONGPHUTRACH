"use strict";

// Bump this when the deployed app shell changes. app-config.js is always
// refreshed from the network so a teacher can replace the public config
// without being trapped by an older Service Worker cache.
const CACHE_NAME = "tpt-doi-thcs-v3-2-1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app-config.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./404.html",
  "./SETUP_CONFIG.html",
  "./core/data-contract.json",
  "./core/platform-adapter.cjs",
  "./school-profile/default.json",
  "./assets/js/import-engine.js",
  "./assets/js/upgrade-features.js",
  "./assets/icons/tpt-doi-icon.svg",
  "./assets/icons/tpt-doi-icon-192.png",
  "./assets/icons/tpt-doi-icon-512.png",
  "./assets/vendor/xlsx/xlsx.full.min.js",
  "./assets/vendor/mammoth/mammoth.browser.min.js",
  "./assets/vendor/pdfjs/pdf.min.mjs",
  "./assets/vendor/pdfjs/pdf.worker.min.mjs",
  "./assets/vendor/tesseract/tesseract.min.js",
  "./assets/vendor/tesseract/worker.min.js",
  "./assets/vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
  "./assets/vendor/tesseract/tesseract-core-simd-lstm.wasm",
  "./assets/vendor/tesseract/lang-data/vie.traineddata.gz",
];

const shellUrls = new Set(
  APP_SHELL.map((path) => new URL(path, self.registration.scope).href),
);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("tpt-doi-thcs-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(event.request, { ignoreSearch: true })) ||
          (await caches.match("./index.html")) ||
          caches.match("./offline.html"),
        ),
    );
    return;
  }

  const configUrl = new URL("./app-config.js", self.registration.scope).href;
  if (url.href === configUrl) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok)
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true })),
    );
    return;
  }

  if (!shellUrls.has(url.href)) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok)
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, response.clone()));
          return response;
        }),
    ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING")
    self.skipWaiting();
});
