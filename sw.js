// Nombre de la caché
const CACHE_NAME = 'generador-logico-v1.1.0';

// Archivos a cachear - USANDO RUTAS ABSOLUTAS
const ARCHIVOS_CACHE = [
  '/',  // Página principal
  '/index.html',
  '/manifest.json',
  '/version.json',
  'https://unpkg.com/tailwindcss@3.4.10/dist/tailwind.min.css'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  
  // Forzar la activación inmediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos');
        return cache.addAll(ARCHIVOS_CACHE);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  
  event.waitUntil(
    // Limpiar caches viejas
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
      // Tomar control inmediato de todas las pestañas
      return self.clients.claim();
    })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', event => {
  // Evitar extensiones de Chrome
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverla
        if (response) {
          return response;
        }
        
        // Si no está en caché, hacer fetch
        return fetch(event.request)
          .then(response => {
            // No cachear si no es exitosa
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            // Guardar en caché para futuras peticiones
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[SW] Fetch falló:', error);
            // Si es una navegación, servir index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
