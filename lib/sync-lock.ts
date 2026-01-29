/**
 * Sync Lock Manager
 * 
 * Prevents race conditions when:
 * - Multiple tabs/windows syncing simultaneously
 * - User triggers manual sync while auto-sync is running
 * - Concurrent patient creation from same device
 */

'use client'

export interface SyncLock {
  lockId: string
  acquiredAt: number
  expiresAt: number
  deviceId: string
  issuedBy: string // component that acquired lock
}

const LOCK_TIMEOUT = 30000 // 30 seconds
const LOCK_CHECK_INTERVAL = 1000 // Check every 1 second

class SyncLockManager {
  private locks: Map<string, SyncLock> = new Map()
  private lockListeners: Map<string, Set<(acquired: boolean) => void>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupInterval()
  }

  /**
   * Try to acquire a lock
   * Returns lock ID if successful, null if already locked
   */
  async acquireLock(
    resourceId: string,
    issuedBy: string = 'unknown'
  ): Promise<string | null> {
    // Check if already locked
    const existingLock = this.locks.get(resourceId)
    if (existingLock && !this.isLockExpired(existingLock)) {
      return null
    }

    // Create new lock
    const lockId = this.generateLockId()
    const deviceId = this.getDeviceId()
    const now = Date.now()

    const lock: SyncLock = {
      lockId,
      acquiredAt: now,
      expiresAt: now + LOCK_TIMEOUT,
      deviceId,
      issuedBy
    }

    this.locks.set(resourceId, lock)
    this.notifyListeners(resourceId, true)

    console.log(`🔒 Lock acquired: ${resourceId} (${lockId})`)
    return lockId
  }

  /**
   * Release a lock
   */
  releaseLock(resourceId: string, lockId: string): boolean {
    const lock = this.locks.get(resourceId)
    
    if (!lock || lock.lockId !== lockId) {
      console.warn(`⚠️ Attempted to release invalid lock: ${resourceId}`)
      return false
    }

    this.locks.delete(resourceId)
    this.notifyListeners(resourceId, false)

    console.log(`🔓 Lock released: ${resourceId}`)
    return true
  }

  /**
   * Check if resource is locked
   */
  isLocked(resourceId: string): boolean {
    const lock = this.locks.get(resourceId)
    return lock !== undefined && !this.isLockExpired(lock)
  }

  /**
   * Get lock info
   */
  getLock(resourceId: string): SyncLock | null {
    const lock = this.locks.get(resourceId)
    return lock && !this.isLockExpired(lock) ? lock : null
  }

  /**
   * Wait for lock to be released
   */
  async waitForLockRelease(
    resourceId: string,
    timeout: number = 60000
  ): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      if (!this.isLocked(resourceId)) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return false
  }

  /**
   * Subscribe to lock changes
   */
  subscribeLockChanges(
    resourceId: string,
    listener: (acquired: boolean) => void
  ): () => void {
    if (!this.lockListeners.has(resourceId)) {
      this.lockListeners.set(resourceId, new Set())
    }

    this.lockListeners.get(resourceId)!.add(listener)

    return () => {
      this.lockListeners.get(resourceId)?.delete(listener)
    }
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): SyncLock[] {
    const active: SyncLock[] = []
    this.locks.forEach((lock, resourceId) => {
      if (!this.isLockExpired(lock)) {
        active.push(lock)
      }
    })
    return active
  }

  /**
   * Force release all locks (use with caution)
   */
  releaseAllLocks(): void {
    this.locks.clear()
    this.lockListeners.forEach((listeners) => {
      listeners.forEach(listener => listener(false))
    })
    console.warn('⚠️ All locks forcefully released')
  }

  private isLockExpired(lock: SyncLock): boolean {
    return Date.now() > lock.expiresAt
  }

  private notifyListeners(resourceId: string, acquired: boolean): void {
    const listeners = this.lockListeners.get(resourceId)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(acquired)
        } catch (error) {
          console.error('Lock listener error:', error)
        }
      })
    }
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceId(): string {
    if (typeof window === 'undefined') {
      return 'server'
    }
    return localStorage.getItem('clinical_trial_device_id') || 'unknown'
  }

  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = false

      this.locks.forEach((lock, resourceId) => {
        if (this.isLockExpired(lock)) {
          console.log(`🧹 Cleaning up expired lock: ${resourceId}`)
          this.locks.delete(resourceId)
          this.notifyListeners(resourceId, false)
          cleaned = true
        }
      })

      if (cleaned) {
        console.log(`🧹 Expired locks cleaned up`)
      }
    }, LOCK_CHECK_INTERVAL)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.locks.clear()
    this.lockListeners.clear()
  }
}

// Export singleton
export const syncLockManager = new SyncLockManager()

/**
 * Utility function to execute code with lock
 * Automatically acquires and releases lock
 */
export async function withSyncLock<T>(
  resourceId: string,
  callback: () => Promise<T>,
  issuedBy: string = 'unknown'
): Promise<T> {
  const lockId = await syncLockManager.acquireLock(resourceId, issuedBy)
  
  if (!lockId) {
    throw new Error(`Failed to acquire lock for ${resourceId}`)
  }

  try {
    return await callback()
  } finally {
    syncLockManager.releaseLock(resourceId, lockId)
  }
}
