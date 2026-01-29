/**
 * Network Connectivity Detection with Auto-Sync
 * 
 * Features:
 * - Detects online/offline status
 * - Automatically syncs when connection returns
 * - Handles offline→online transitions gracefully
 * - Avoids "stuck offline" bug
 */

'use client'

type ConnectionListener = (isOnline: boolean) => void
type SyncListener = (status: string) => void

class NetworkDetector {
  private isOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true
  private listeners: Set<ConnectionListener> = new Set()
  private syncListeners: Set<SyncListener> = new Set()
  private initialized: boolean = false
  private isCheckingConnection: boolean = false
  private syncInProgress: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    if (typeof window === 'undefined' || this.initialized) return

    this.initialized = true

    const handleOnline = () => {
      this.handleConnectionRestored()
    }

    const handleOffline = () => {
      this.isOnline = false
      this.notifyListeners()
      this.notifySyncListeners('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  /**
   * Handle connection restoration with verification
   */
  private async handleConnectionRestored(): Promise<void> {
    if (this.isCheckingConnection) return
    this.isCheckingConnection = true

    try {
      // Wait for connection to stabilize
      await new Promise(r => setTimeout(r, 1000))

      // Verify connection is actually working
      const isConnected = await this.verifyConnection()

      if (isConnected) {
        this.isOnline = true
        this.notifyListeners()
        this.notifySyncListeners('online')
        
        // Auto-start sync
        await this.triggerSync()
      }
    } catch (error) {
      console.error('Error handling connection restoration:', error)
    } finally {
      this.isCheckingConnection = false
    }
  }

  /**
   * Verify connection with actual request
   */
  private async verifyConnection(): Promise<boolean> {
    try {
      const response = await fetch('/version.json', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Trigger sync via dynamic import
   */
  private async triggerSync(): Promise<void> {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      this.notifySyncListeners('syncing')

      // Dynamically import sync engine to avoid circular dependencies
      const { advancedSyncEngine } = await import('@/lib/advanced-sync-engine')
      const result = await advancedSyncEngine.syncAllPendingChanges()

      if (result.success) {
        this.notifySyncListeners('sync_complete')
        console.log(`✓ Synced ${result.itemsSynced} items`)
      } else {
        this.notifySyncListeners('sync_failed')
        console.log(`⚠️ Sync partial: ${result.itemsSynced} success, ${result.itemsFailed} failed`)
      }
    } catch (error) {
      this.notifySyncListeners('sync_error')
      console.error('Sync error:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Check if device is currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Subscribe to connection status changes
   * @param listener - Callback function for connection changes
   * @returns Unsubscribe function
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribeSyncStatus(listener: SyncListener): () => void {
    this.syncListeners.add(listener)
    return () => this.syncListeners.delete(listener)
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }
    await this.triggerSync()
  }

  /**
   * Get sync status
   */
  isSyncing(): boolean {
    return this.syncInProgress
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        console.error('Error notifying connection listener:', error)
      }
    })
  }

  private notifySyncListeners(status: string): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error notifying sync listener:', error)
      }
    })
  }
}

// Export singleton instance
export const networkDetector = new NetworkDetector()

/**
 * Hook to detect online/offline status
 * Usage in React components:
 * const isOnline = useNetworkStatus()
 */
import { useState, useEffect } from 'react'

export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const unsubscribe = networkDetector.subscribe(setIsOnline)
    return unsubscribe
  }, [])

  return isOnline
}

/**
 * Check if a network operation is possible
 * Shows user-friendly message if offline
 * @param message - Optional custom message
 * @returns Boolean indicating if operation can proceed
 */
export const checkNetworkAvailable = (message: string = 'You appear to be offline'): boolean => {
  if (!networkDetector.getOnlineStatus()) {
    // Try to import toast if available
    try {
      const toastModule = require('@/hooks/use-toast')
      if (toastModule?.useToast) {
        // Can't use hook here, just log warning
        console.warn(message)
      }
    } catch {
      console.warn(message)
    }
    return false
  }
  return true
}
