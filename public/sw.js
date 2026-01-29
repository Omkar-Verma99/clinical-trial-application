/**
 * Advanced Service Worker for Clinical Trial Application
 * ✓ Network-first for dynamic content
 * ✓ Cache-first for static assets  
 * ✓ Background sync for offline data
 * ✓ Auto cache clearing on version change
 * ✓ Offline form queuing
 */

const CACHE_VERSION = 'v3-offline-sync'
const STATIC_CACHE = 'static-v3'
const DYNAMIC_CACHE = 'dynamic-v3'
const APP_VERSION = 'v3'

// Install event - cache critical files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/patients',
        '/login'
      ]).catch(() => {
        // Offline, will cache on demand
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          // Clear old versioned caches
          if (!name.includes(APP_VERSION)) {
            console.log('🗑️ Clearing old cache:', name)
            return caches.delete(name)
          }
        })
      )
    }).then(() => {
      console.log('✅ Cache cleaned and clients claimed')
      return self.clients.claim()
    })
  )
})


// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and external requests
  if (request.method !== 'GET') return
  if (!url.origin.includes(self.location.origin)) return

  // Static assets: Cache first
  if (url.pathname.startsWith('/_next/static/') || /\.(js|css|woff2|woff|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((resp) => resp || fetch(request).then((res) => {
          if (res.status === 200) {
            const toCache = res.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, toCache)
            })
          }
          return res
        }))
        .catch(() => new Response('Offline', { status: 503 }))
    )
    return
  }

  // HTML/API: Network first with offline fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.status === 200) {
          const toCache = res.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, toCache)
          })
        }
        return res
      })
      .catch(() => {
        // Try cache first if network fails
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // Offline: serve offline page or stub
          return new Response('Offline - cached data unavailable', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          })
        })
      })
  )
})

// Background sync for offline forms (when online returns)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      (async () => {
        try {
          // Notify client to start sync
          const clients = await self.clients.matchAll()
          clients.forEach((client) => {
            client.postMessage({
              type: 'START_SYNC',
              timestamp: Date.now()
            })
          })
        } catch (error) {
          console.error('Background sync failed:', error)
        }
      })()
    )
  }
})

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name)))
    })
  }
})
