/**
 * Offline Queue System
 * 
 * Manages all pending changes when offline:
 * - Patient creation
 * - Form submissions
 * - Patient updates
 * 
 * Syncs automatically when online
 */

'use client'

export interface QueuedChange {
  id: string // Unique queue ID
  tempId?: string // Temporary offline ID (for new patients)
  type: 'patient_create' | 'patient_update' | 'form_submit' | 'form_update'
  patientId: string // Real or temp ID
  data: any
  timestamp: number
  retries: number
  lastError?: string
  synced: boolean
}

class OfflineQueue {
  private static readonly DB_NAME = 'clinical-trial-db'
  private static readonly QUEUE_STORE = 'offline_queue'
  private static readonly MAX_RETRIES = 3
  private db: IDBDatabase | null = null

  constructor() {
    this.initDB()
  }

  /**
   * Initialize IndexedDB with queue store
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve()
        return
      }

      const request = indexedDB.open(OfflineQueue.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create queue store
        if (!db.objectStoreNames.contains(OfflineQueue.QUEUE_STORE)) {
          const store = db.createObjectStore(OfflineQueue.QUEUE_STORE, {
            keyPath: 'id'
          })
          store.createIndex('synced', 'synced', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
        }
      }
    })
  }

  /**
   * Add change to queue
   */
  async addToQueue(
    type: QueuedChange['type'],
    patientId: string,
    data: any,
    tempId?: string
  ): Promise<string> {
    await this.ensureDB()

    const id = this.generateQueueId()
    const change: QueuedChange = {
      id,
      tempId,
      type,
      patientId,
      data,
      timestamp: Date.now(),
      retries: 0,
      synced: false
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.add(change)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(id)
    })
  }

  /**
   * Get all pending changes
   */
  async getPendingChanges(): Promise<QueuedChange[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readonly')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const changes = (request.result as QueuedChange[]).filter(c => !c.synced)
        // Sort by type priority and timestamp
        resolve(
          changes.sort((a, b) => {
            const typePriority: Record<string, number> = {
              'patient_create': 1,
              'patient_update': 2,
              'form_submit': 3,
              'form_update': 4
            }
            const priorityDiff = typePriority[a.type] - typePriority[b.type]
            return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
          })
        )
      }
    })
  }

  /**
   * Get pending changes by type
   */
  async getPendingChangesByType(type: QueuedChange['type']): Promise<QueuedChange[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readonly')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const index = store.index('type')
      const request = index.getAll(type)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const changes = request.result as QueuedChange[]
        resolve(changes.filter(c => !c.synced))
      }
    })
  }

  /**
   * Mark change as synced
   */
  async markAsSynced(
    queueId: string,
    realPatientId?: string
  ): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.get(queueId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const change = request.result as QueuedChange
        if (change) {
          change.synced = true
          if (realPatientId) change.patientId = realPatientId
          const updateRequest = store.put(change)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
    })
  }

  /**
   * Update retry count and error
   */
  async updateRetry(
    queueId: string,
    error: string
  ): Promise<boolean> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.get(queueId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const change = request.result as QueuedChange
        if (change) {
          change.retries++
          change.lastError = error
          
          if (change.retries >= OfflineQueue.MAX_RETRIES) {
            change.synced = false // Mark as failed, not synced
          }

          const updateRequest = store.put(change)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve(change.retries < OfflineQueue.MAX_RETRIES)
        } else {
          resolve(false)
        }
      }
    })
  }

  /**
   * Remove from queue (after successful sync)
   */
  async removeFromQueue(queueId: string): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.delete(queueId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clear entire queue (use with caution)
   */
  async clearQueue(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number
    pending: number
    failed: number
  }> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineQueue.QUEUE_STORE, 'readonly')
      const store = tx.objectStore(OfflineQueue.QUEUE_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const changes = request.result as QueuedChange[]
        resolve({
          total: changes.length,
          pending: changes.filter(c => !c.synced && c.retries < OfflineQueue.MAX_RETRIES).length,
          failed: changes.filter(c => c.retries >= OfflineQueue.MAX_RETRIES).length
        })
      }
    })
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) await this.initDB()
  }

  private generateQueueId(): string {
    // Cryptographically secure ID generation
    // Prevents collisions even with concurrent operations
    const timestamp = Date.now()
    const randomPart = crypto.getRandomValues(new Uint8Array(16))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
    return `queue_${timestamp}_${randomPart.substring(0, 16)}`
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue()

// Export class for direct instantiation if needed
export { OfflineQueue }
