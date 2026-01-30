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

/**
 * Background Sync Event Handler
 * Triggered by browser when:
 * 1. Network comes online
 * 2. Device has adequate battery
 * Works even if app tab is closed
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-clinical-data' || event.tag === 'sync-offline-data') {
    event.waitUntil(
      (async () => {
        try {
          console.log('🔄 Background sync triggered - syncing pending changes...')
          
          // Open IndexedDB to get pending changes
          const db = await openClinicalDB()
          const pending = await getPendingChanges(db)
          
          if (pending.length === 0) {
            console.log('✅ No pending changes to sync')
            return
          }
          
          console.log(`📤 Syncing ${pending.length} pending items...`)
          
          // Import Firebase SDK dynamically
          const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js')
          const { getFirestore, collection, doc, setDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js')
          
          // Get Firebase config from window or use hardcoded (should match app config)
          const firebaseConfig = {
            apiKey: "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
            authDomain: "kollectcare-rwe-study.firebaseapp.com",
            projectId: "kollectcare-rwe-study",
            storageBucket: "kollectcare-rwe-study.firebasestorage.app",
            messagingSenderId: "716627719667",
            appId: "1:716627719667:web:a828412396c68af35b8e86"
          }
          
          // Initialize Firebase
          const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
          const db_firebase = getFirestore(app)
          
          // Sync each pending change
          let syncedCount = 0
          let failedCount = 0
          
          for (const item of pending) {
            try {
              await syncSingleItem(db_firebase, item)
              // Mark as synced in IndexedDB
              await markAsSynced(db, item.id)
              syncedCount++
            } catch (error) {
              console.error(`Failed to sync item ${item.id}:`, error)
              failedCount++
            }
          }
          
          console.log(`✅ Background sync complete: ${syncedCount} synced, ${failedCount} failed`)
          
          // Notify any open clients
          const clients = await self.clients.matchAll()
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              syncedCount,
              failedCount,
              timestamp: Date.now()
            })
          })
        } catch (error) {
          console.error('Background sync error:', error)
          
          // Notify clients of failure
          const clients = await self.clients.matchAll()
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_FAILED',
              error: error.message,
              timestamp: Date.now()
            })
          })
        }
      })()
    )
  }
})

/**
 * Helper: Open clinical trial database
 */
function openClinicalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('clinical-trial-db', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/**
 * Helper: Get pending changes from IndexedDB
 */
function getPendingChanges(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_queue', 'readonly')
    const store = tx.objectStore('offline_queue')
    const index = store.index('synced')
    const request = index.getAll(false)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Helper: Sync single item to Firebase
 */
async function syncSingleItem(db, item) {
  const { collection, doc, setDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js')
  
  if (item.type === 'patient_create') {
    // Create new patient using setDoc with consistent ID
    await setDoc(doc(db, 'patients', item.patientId), {
      ...item.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } else if (item.type === 'patient_update') {
    // Update existing patient
    await updateDoc(doc(db, 'patients', item.patientId), {
      ...item.data,
      updatedAt: serverTimestamp()
    })
  } else if (item.type === 'form_submit') {
    // V4 UNIFIED SCHEMA: Update patient doc with baseline/followups arrays
    // NOT creating subcollections like the old code tried to do
    const patientId = item.patientId
    const formData = item.data
    const formType = formData.formType || 'baseline'
    
    if (formType === 'baseline') {
      // Update baseline field in patient document
      await updateDoc(doc(db, 'patients', patientId), {
        baseline: {
          ...formData,
          syncedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      })
    } else if (formType === 'followup') {
      // Update followups array in patient document
      const patientRef = doc(db, 'patients', patientId)
      const patientSnap = await (await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js')).getDoc(patientRef)
      const patientData = patientSnap.data() || {}
      const followups = patientData.followups || []
      
      // Check if followup already exists by formId
      const existingIndex = followups.findIndex(f => f.formId === formData.formId)
      if (existingIndex >= 0) {
        followups[existingIndex] = { ...formData, syncedAt: serverTimestamp() }
      } else {
        followups.push({ ...formData, syncedAt: serverTimestamp() })
      }
      
      await updateDoc(patientRef, {
        followups,
        updatedAt: serverTimestamp()
      })
    }
  }
}

/**
 * Helper: Mark item as synced in IndexedDB
 */
function markAsSynced(db, itemId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_queue', 'readwrite')
    const store = tx.objectStore('offline_queue')
    const request = store.get(itemId)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const item = request.result
      if (item) {
        item.synced = true
        item.syncedAt = Date.now()
        store.put(item)
        resolve()
      }
    }
  })
}

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
