// Service Worker for GearUp RO Rentals
const CACHE_NAME = 'gearup-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'GearUp RO Rentals',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      silent: false
    }
  );

  event.waitUntil(notificationPromise);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const notificationData = event.notification.data;
  let urlToOpen = '/';

  // Handle different notification types
  if (notificationData?.type === 'booking') {
    urlToOpen = `/dashboard?tab=bookings&booking=${notificationData.bookingId}`;
  } else if (notificationData?.type === 'message') {
    urlToOpen = `/messages?booking=${notificationData.bookingId}`;
  } else if (notificationData?.type === 'payment') {
    urlToOpen = `/dashboard?tab=financials`;
  } else if (notificationData?.type === 'claim') {
    urlToOpen = `/dashboard?tab=owner`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  try {
    // Example: Sync offline data when connection is restored
    console.log('Handling background sync...');
    
    // You can add offline data sync logic here
    // For example, sync pending messages, uploads, etc.
    
  } catch (error) {
    console.error('Error in background sync:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic background sync event:', event);

  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      handlePeriodicSync()
    );
  }
});

async function handlePeriodicSync() {
  try {
    console.log('Handling periodic sync...');
    
    // Example: Check for updates, sync data, etc.
    // This runs periodically even when the app is not active
    
  } catch (error) {
    console.error('Error in periodic sync:', error);
  }
}

// Message event (for communication with main thread)
self.addEventListener('message', (event) => {
  console.log('Service worker message received:', event);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 