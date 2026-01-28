/**
 * Minimal Service Worker for Kare Clinical Trial Application
 * Handles offline support and basic caching
 */

const CACHE_VERSION = 'v1-kare'
const CACHE_URLS = [
  '/',
  '/dashboard',
  '/patients',
  '/offline.html',
]

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_URLS).catch(() => {
        console.log('Service Worker: Some critical assets could not be cached')
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip requests to external domains (except API)
  if (!event.request.url.includes(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // If cached, return it
      if (response) {
        return response
      }

      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      }).catch(() => {
        // Network request failed, try to return a cached response
        return caches.match(event.request)
      })
    })
  )
})
