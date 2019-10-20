/* globals self, Response */

// this is needed to create a binary-different file when
// I don't need to make any actual changes to this file
const VERSION = 'v1.0.1';
const WORKER = '👷';
const KEY = 'share-edit-v1';
const PATHS = [
  './',
  // modules
  './src/loader.js',
  './src/toast.js',
  './src/event-emitter.js',
  './src/image.js',
  './src/open.js',
  // style and assets
  './src/style.css',
  './manifest.json',
//  './assets/icon-512.png',
  // cdn files
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
  'https://cdn.jsdelivr.net/npm/toastify-js@1.6.1/src/toastify.min.css',
  'https://cdn.jsdelivr.net/npm/toastify-js@1.6.1/src/toastify.min.js',
  'https://cdn.jsdelivr.net/npm/exif-js@2.3.0/exif.min.js',
];

// eslint-disable-next-line no-console
const log = (...args) => console.log(WORKER, VERSION, ...args);

const serveShareTarget = event => {
  // Redirect so the user can refresh the page without resending data.
  event.respondWith(Response.redirect(event.request.url));

  event.waitUntil(async function () {
    const data = await event.request.formData();
    const client = await self.clients.get(event.resultingClientId);
    const file = data.get('file');
    client.postMessage({ file, action: 'load-image' });
  }());
};

const createCache = async () => {
  const cache = await caches.open(KEY);
  await cache.addAll(PATHS);
};

const clearCache = async () => {
  log('CLEARING CACHE');
  await caches.delete(KEY);
};

self.addEventListener('install', (event) => {
  log('INSTALL start');
  const start = Date.now();
  event.waitUntil((async () => {
    await createCache();
    await self.skipWaiting();
    log('INSTALL done in', Date.now() - start);
  })());
});

self.addEventListener('activate', (event) => {
  log('ACTIVATE start');
  const start = Date.now();
  event.waitUntil((async () => {
    await clearCache();
    await createCache();
    await self.clients.claim();
    log('ACTIVATE done in', Date.now() - start);
  })());
});

self.addEventListener('fetch', (event) => {
  log('fetch', event.request.method, event.request.url);
  const url = new URL(event.request.url);

  const isSameOrigin = url.origin === location.origin;
  const isShareTarget = isSameOrigin && url.searchParams.has('share-target');
  const isSharePost = isShareTarget && event.request.method === 'POST';

  if (isSharePost) {
    log('handling share target request');
    return void serveShareTarget(event);
  }

  const isLocal = /^([0-9]+\.){3}[0-9]+$/.test(location.hostname);
  // const isLocal = location.hostname === 'localhost' || /^([0-9]+\.){3}[0-9]+$/.test(location.hostname);

  if (isLocal) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(KEY);
    const response = !isShareTarget ?
      await cache.match(event.request) :
      await cache.match(event.request, { ignoreSearch: true });

    if (response) {
      log('serving cache result for', event.request.method, event.request.url);
      return response;
    }

    log('serving network result for', event.request.method, event.request.url);
    return fetch(event.request);
  })());
});
