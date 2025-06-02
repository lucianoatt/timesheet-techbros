// Service Worker para Timesheet App
const CACHE_NAME = 'timesheet-app-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requests de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver desde cache si está disponible
        if (response) {
          return response;
        }

        // Clonar el request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Si falla la red, devolver página offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  const options = {
    body: 'Nueva notificación de Timesheet App',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir App',
        icon: '/icon-128x128.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-128x128.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Timesheet App', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    event.notification.close();
  }
});

// Sincronización en background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sincronizar datos cuando la conexión se restablezca
  console.log('Sincronización en background ejecutada');
  
  // Aquí puedes agregar lógica para sincronizar datos
  // Por ejemplo, enviar datos almacenados localmente al servidor
  try {
    // Simular sincronización de datos
    const timesheetData = localStorage.getItem('timesheetData');
    const gpxData = localStorage.getItem('gpxData');
    const expenseData = localStorage.getItem('expenseData');
    
    if (timesheetData || gpxData || expenseData) {
      console.log('Datos disponibles para sincronizar');
      // Aquí enviarías los datos al servidor
    }
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
}