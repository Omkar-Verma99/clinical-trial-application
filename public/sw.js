/**
 * Simple, Reliable Service Worker for Clinical Trial Application
 * ✓ Network-first for dynamic content
 * ✓ Cache-first for static assets  
 * ✓ Minimal, no cloning issues
 */

const CACHE_VERSION = 'v2-stable'
const STATIC_CACHE = 'static-v2'
const DYNAMIC_CACHE = 'dynamic-v2'

// Install event
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_VERSION && name !== STATIC_CACHE && name !== DYNAMIC_CACHE) {
            return caches.delete(name)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET
  if (request.method !== 'GET') return

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) return

  // Static assets: Cache first
  if (url.pathname.startsWith('/_next/static/') || /\.(js|css|woff2|woff|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((resp) => resp || fetch(request).then((res) => {
          if (res.status === 200) {
            // Clone response, then cache it
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

  // HTML/API: Network first
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.status === 200) {
          // Clone before caching
          const toCache = res.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, toCache)
          })
        }
        return res
      })
      .catch(() => {
        return caches.match(request) || new Response('Offline', { status: 503 })
      })
  )
})
