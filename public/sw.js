/**
 * Optimized Service Worker for Clinical Trial Application
 * ✓ Network-first for dynamic content (fast)
 * ✓ Cache-first for static assets (offline support)
 * ✓ Smart stale-while-revalidate for images
 */

const CACHE_VERSION = 'v1-optimized'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'
const IMAGE_CACHE = 'images-v1'

// Static assets that should be cached from _next/static/
const STATIC_ASSET_PATTERNS = [
  /_next\/static\//,
  /\.(js|css|woff2|woff|ttf|eot)$/,
]

const IMAGE_PATTERNS = [
  /\.(png|jpg|jpeg|gif|webp|svg)$/,
]

// Install event - skip waiting for immediate activation
self.addEventListener('install', (event) => {
  // Skip the waiting phase - activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const keepCaches = [CACHE_VERSION, STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE]
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!keepCaches.includes(cacheName)) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Helper: Check if URL matches pattern
function matchesPattern(url, patterns) {
  return patterns.some((pattern) => pattern.test(url))
}

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome extensions and external requests
  if (!url.origin.includes(self.location.origin) && !url.hostname.includes(self.location.hostname)) {
    return
  }

  // Strategy 1: Static assets (CSS, JS from _next/static) - CACHE FIRST
  if (matchesPattern(url.pathname, STATIC_ASSET_PATTERNS)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const cache = caches.open(STATIC_CACHE)
            cache.then((c) => c.put(request, response.clone()))
          }
          return response
        }).catch(() => new Response('Offline', { status: 503 }))
      })
    )
    return
  }

  // Strategy 2: Images - CACHE FIRST with stale-while-revalidate
  if (matchesPattern(url.pathname, IMAGE_PATTERNS)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          // Update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, networkResponse)
              })
            }
          }).catch(() => {})
          return response
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, response.clone())
            })
          }
          return response
        }).catch(() => {
          return new Response('No image available', { status: 404 })
        })
      })
    )
    return
  }

  // Strategy 3: HTML pages and API - NETWORK FIRST (fast!)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const cache = caches.open(DYNAMIC_CACHE)
          cache.then((c) => c.put(request, response.clone()))
        }
        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((response) => {
          return response || new Response('Offline', { status: 503 })
        })
      })
  )
})
