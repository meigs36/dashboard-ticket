// Service Worker per PWA - Dashboard Ticket System
const CACHE_NAME = 'dashboard-ticket-v1.0.0'
const RUNTIME_CACHE = 'dashboard-ticket-runtime'

// Asset statici da cachare all'installazione
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/ticket',
  '/clienti',
  '/macchinari',
  '/offline',
  '/manifest.json'
]

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  
  // Rimuovi vecchie cache
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Strategia di fetch: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip per richieste cross-origin non Supabase
  if (url.origin !== self.location.origin && !url.origin.includes('supabase.co')) {
    return
  }

  // API calls: Network First
  if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Assets statici: Cache First
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Pagine: Network First con fallback offline
  event.respondWith(networkFirstWithOfflineFallback(request))
})

// Strategia Network First (per dati dinamici)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Se è una richiesta API, restituisci un errore JSON
    if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
      return new Response(
        JSON.stringify({ error: 'Offline', message: 'Sei offline. I dati non sono disponibili.' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Strategia Cache First (per asset statici)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Failed to fetch:', request.url)
    throw error
  }
}

// Strategia Network First con pagina offline
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fallback alla pagina offline
    const offlinePage = await caches.match('/offline')
    if (offlinePage) {
      return offlinePage
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        )
      })
    )
  }
})

// Background Sync per sincronizzare dati quando torna online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-tickets') {
    event.waitUntil(syncTickets())
  }
})

async function syncTickets() {
  // Qui puoi implementare la logica di sincronizzazione
  // per inviare ticket creati offline quando si torna online
  console.log('[SW] Syncing tickets...')
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'Nuovo aggiornamento disponibile',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'ticket-notification',
    actions: [
      {
        action: 'open',
        title: 'Apri'
      },
      {
        action: 'close',
        title: 'Chiudi'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('Dashboard Ticket', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  }
})

console.log('[SW] Service Worker loaded')
