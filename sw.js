// Nombre de la caché - CAMBIA ESTE NÚMERO CADA VEZ QUE ACTUALICES
const CACHE_NAME = 'generador-logico-v1.0.0';
const APP_VERSION = '1.0.0';

// Archivos a cachear
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  'https://unpkg.com/tailwindcss-cdn@3.4.10/tailwindcss.js',
  // Posibles recursos futuros
  './manifest.json',
  './version.json'
];

// Evento 'install'
self.addEventListener('install', event => {
  console.log('[SW] Instalando versión:', APP_VERSION);
  
  // Fuerza la activación inmediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos esenciales');
        return cache.addAll(ARCHIVOS_CACHE);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// Evento 'activate'
self.addEventListener('activate', event => {
  console.log('[SW] Activado versión:', APP_VERSION);
  
  event.waitUntil(
    // Limpiar todas las cachés antiguas
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Reclamar control inmediatamente sobre todas las pestañas
      return self.clients.claim();
    }).then(() => {
      // Enviar mensaje a todas las pestañas para recargar
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: APP_VERSION
          });
        });
      });
    })
  );
});

// Evento 'fetch'
self.addEventListener('fetch', event => {
  // Para index.html, siempre intenta red primero
  if (event.request.url.includes('/index.html') || 
      event.request.mode === 'navigate') {
    console.log('[SW] Fetch para HTML, usando network-first');
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si hay respuesta de red, actualiza la caché
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // Si falla la red, usa la caché
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para Tailwind CDN, usa cache-first con validación
  if (event.request.url.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Hacer fetch en segundo plano para actualizar
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              // Actualizar caché con nueva versión
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
              return networkResponse;
            })
            .catch(() => {}); // Ignorar errores en fetch de fondo
          
          // Devolver caché inmediatamente, actualizar en segundo plano
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }
  
  // Para el resto, cache-first normal
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Escuchar mensajes desde la página web
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Verificar actualizaciones
    self.registration.update()
      .then(() => {
        console.log('[SW] Actualización verificada');
      });
  }
});