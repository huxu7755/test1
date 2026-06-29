/* sw.js — Service Worker（离线缓存） */

var CACHE_NAME = 'reminders-v1';
var ASSETS = [
  'index.html',
  'css/style.css',
  'js/storage.js',
  'js/lists.js',
  'js/reminders.js',
  'js/calendar.js',
  'js/views.js',
  'js/app.js',
  'manifest.json'
];

// 安装：预缓存核心资源
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
          .map(function(key){ return caches.delete(key); })
      );
    })
  );
});

// 请求：缓存优先策略
self.addEventListener('fetch', function(event){
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse){
      if(cachedResponse) return cachedResponse;
      return fetch(event.request).then(function(response){
        // 仅缓存成功响应的同源请求
        if(response && response.status === 200 && response.type === 'basic'){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
