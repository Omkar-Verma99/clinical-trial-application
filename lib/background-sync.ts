/**
 * Background Sync Utility
 * 
 * Uses native Browser Background Sync API to sync data when app is closed
 * - Registers sync when offline data is saved
 * - Browser triggers sync when online (NOT periodic polling)
 * - Works even if app tab is closed
 * - Battery efficient (browser handles timing)
 * 
 * HOW IT WORKS:
 * 1. User saves form offline
 * 2. App calls registerBackgroundSync()
 * 3. Service Worker receives 'sync' event when online
 * 4. Service Worker directly syncs to Firebase
 * 5. Done - no app needed to be open
 */

'use client'

const SYNC_TAG = 'sync-clinical-data'

// TypeScript support for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>
    }
  }
}

/**
 * Register background sync
 * Called when offline data is saved
 * Browser will trigger sync when online
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    // Check if Background Sync is supported
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker not supported')
      return
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      console.log('⚠️ Service Worker not registered yet')
      return
    }

    // Check if sync manager is available
    if (!registration.sync) {
      console.log('⚠️ Background Sync API not supported in this browser')
      return
    }

    // Register sync (will trigger when online)
    try {
      await registration.sync.register(SYNC_TAG)
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✅ Background sync registered - will sync when online')
      }
    } catch (error) {
      // Sync might already be registered, that's fine
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('Background sync already registered or permission denied')
      }
    }
  } catch (error) {
    console.error('Error registering background sync:', error)
    // Non-critical - app will still sync when opened
  }
}

/**
 * Check if Background Sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 
         'SyncManager' in window
}
