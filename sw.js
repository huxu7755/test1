/* sw.js — Service Worker 离线缓存 */
'use strict';

const CACHE_NAME = 'reminders-v2';

const ASSETS = [
  '/',
  'index.html',
  'css/style.css',
  'js/storage.js',
  'js/lists.js',
  'js/reminders.js',
  'js/calendar.js',
  'js/backup.js',
  'js/sync.js',
  'js/views.js',
  'js/app.js',
  'manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).catch(function(err) {
      console.warn('SW install cache error:', err);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(resp) {
      return resp || fetch(event.request);
    })
  );
});
