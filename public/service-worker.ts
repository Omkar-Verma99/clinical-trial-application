/**
 * Advanced Service Worker - Enterprise Caching & Background Sync
 * 
 * Features:
 * ✓ Intelligent caching strategies (network-first, cache-first)
 * ✓ Background sync queue
 * ✓ Offline-first responses
 * ✓ Push notifications
 * ✓ Cache versioning and cleanup
 */

const CACHE_VERSION = 'v1-advanced'
const CACHES_TO_KEEP = ['v1-advanced']

const CACHE_STRATEGIES = {
  // API calls - try network first, fallback to cache
  API: 'network-first',
  // Static assets - cache first, fallback to network
  ASSETS: 'cache-first',
  // HTML pages - network first, fallback to cache
  PAGES: 'network-first',
  // Images - cache first with stale-while-revalidate
  IMAGES: 'cache-first',
}

// ========== INSTALL EVENT ==========
self.addEventListener('install', (event: ExtendedEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION)

      // Pre-cache critical assets
      const criticalAssets = [
        '/',
        '/dashboard',
        '/patients',
        '/offline.html',
      ]

      await cache.addAll(criticalAssets).catch(() => {
        // Fail silently if some assets aren't available yet
      })

      // Skip waiting to activate immediately
      ;(self as any).skipWaiting()
    })()
  )
})

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', (event: ExtendedEvent) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!CACHES_TO_KEEP.includes(cacheName)) {
            return caches.delete(cacheName)
          }
        })
      )

      // Claim all clients
      ;(self as any).clients.claim()
    })()
  )
})

// ========== FETCH EVENT ==========
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Determine caching strategy based on URL
  let strategy = CACHE_STRATEGIES.ASSETS

  if (url.pathname.startsWith('/api/')) {
    strategy = CACHE_STRATEGIES.API
  } else if (url.pathname.endsWith('.html')) {
    strategy = CACHE_STRATEGIES.PAGES
  } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    strategy = CACHE_STRATEGIES.IMAGES
  }

  // Execute appropriate strategy
  if (strategy === 'network-first') {
    event.respondWith(networkFirst(request))
  } else if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(staleWhileRevalidate(request))
  }
})

// ========== CACHING STRATEGIES ==========

/**
 * Network First Strategy
 * Try network, fall back to cache
 */
async function networkFirst(request: Request): Promise<Response> {
  const cacheName = CACHE_VERSION

  try {
    const networkResponse = await fetch(request)

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // No cache, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No internet connection and data not cached',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Cache First Strategy
 * Use cache, fall back to network
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cacheName = CACHE_VERSION

  // Try cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Cache miss, try network
  try {
    const networkResponse = await fetch(request)

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cache immediately, update in background
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cacheName = CACHE_VERSION
  const cache = await caches.open(cacheName)

  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request).then((response) => {
    // Update cache in background
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  })

  return cachedResponse || fetchPromise
}

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms())
  }
})

async function syncForms() {
  try {
    // Trigger sync in all clients
    const clients = await (self as any).clients.matchAll()
    clients.forEach((client: any) => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        data: { action: 'sync-forms' },
      })
    })
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// ========== MESSAGE HANDLING ==========
self.addEventListener('message', (event: ExtendedMessageEvent) => {
  const { type, data } = event.data

  if (type === 'SKIP_WAITING') {
    ;(self as any).skipWaiting()
  }

  if (type === 'CACHE_BUST') {
    cacheBust(data.urls)
  }

  if (type === 'PRELOAD_ASSETS') {
    preloadAssets(data.urls)
  }
})

async function cacheBust(urls: string[]) {
  const cache = await caches.open(CACHE_VERSION)
  for (const url of urls) {
    await cache.delete(url)
  }
}

async function preloadAssets(urls: string[]) {
  const cache = await caches.open(CACHE_VERSION)
  await cache.addAll(urls).catch(() => {
    // Fail silently
  })
}

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || {}
  const options: NotificationOptions = {
    badge: '/icon-192x192.png',
    icon: '/icon-192x192.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    ...data.options,
  }

  event.waitUntil(
    (self as any).registration.showNotification(data.title || 'Notification', options)
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  event.waitUntil(
    (async () => {
      const clients = await (self as any).clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Focus existing window
      for (const client of clients) {
        if (client.url === event.notification.tag && 'focus' in client) {
          return (client as any).focus()
        }
      }

      // Open new window
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(event.notification.tag || '/')
      }
    })()
  )
})

// ========== TYPE DEFINITIONS ==========
interface ExtendedEvent extends Event {
  waitUntil(promise: Promise<any>): void
}

interface FetchEvent extends ExtendedEvent {
  request: Request
  respondWith(promise: Promise<Response>): void
}

interface PushEvent extends ExtendedEvent {
  data?: {
    json(): any
  }
}

interface NotificationEvent extends ExtendedEvent {
  notification: Notification
  action?: string
}

interface ExtendedMessageEvent extends ExtendedEvent {
  data: {
    type: string
    data?: any
  }
}

declare const self: any

export {}
