/**
 * Advanced Sync Engine
 * 
 * Handles synchronization of offline changes with Firestore
 * - Auto-syncs when online
 * - Handles conflicts
 * - Manages temporary ID mapping
 * - Retry logic with exponential backoff
 */

'use client'

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  WriteBatch,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { offlineQueue, type QueuedChange } from '@/lib/offline-queue'
import { offlineFormHandler } from '@/lib/offline-form-handler'

export interface SyncResult {
  success: boolean
  itemsSynced: number
  itemsFailed: number
  errors: Array<{ id: string; error: string }>
  tempToRealIdMap: Map<string, string>
}

class AdvancedSyncEngine {
  private isSyncing = false
  private syncListeners: Set<(status: SyncStatus) => void> = new Set()

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing
  }

  /**
   * Subscribe to sync status changes
   */
  subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener)
    return () => this.syncListeners.delete(listener)
  }

  private notifySyncStatus(status: SyncStatus): void {
    this.syncListeners.forEach(listener => listener(status))
  }

  /**
   * Start synchronization of all pending changes
   */
  async syncAllPendingChanges(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress')
      return {
        success: false,
        itemsSynced: 0,
        itemsFailed: 0,
        errors: [{ id: 'sync-in-progress', error: 'Sync already in progress' }],
        tempToRealIdMap: new Map()
      }
    }

    this.isSyncing = true
    this.notifySyncStatus({ status: 'syncing', message: 'Starting sync...' })

    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      tempToRealIdMap: new Map()
    }

    try {
      // Get all pending changes
      const pendingChanges = await offlineQueue.getPendingChanges()

      if (pendingChanges.length === 0) {
        this.notifySyncStatus({ status: 'idle', message: 'No changes to sync' })
        return result
      }

      this.notifySyncStatus({
        status: 'syncing',
        message: `Syncing ${pendingChanges.length} changes...`,
        progress: 0,
        total: pendingChanges.length
      })

      // Process changes in order (patients first, then forms)
      for (let i = 0; i < pendingChanges.length; i++) {
        const change = pendingChanges[i]

        try {
          await this.syncSingleChange(change, result)
          result.itemsSynced++
        } catch (error) {
          console.error(`❌ Failed to sync ${change.id}:`, error)
          result.itemsFailed++
          result.errors.push({
            id: change.id,
            error: error instanceof Error ? error.message : String(error)
          })

          // Retry logic
          const shouldRetry = await offlineQueue.updateRetry(
            change.id,
            error instanceof Error ? error.message : String(error)
          )

          if (!shouldRetry) {
            result.success = false
          }
        }

        // Update progress
        this.notifySyncStatus({
          status: 'syncing',
          message: `Synced ${i + 1}/${pendingChanges.length}`,
          progress: i + 1,
          total: pendingChanges.length
        })
      }

      if (result.itemsFailed === 0) {
        this.notifySyncStatus({
          status: 'success',
          message: `✓ Synced ${result.itemsSynced} items`
        })
      } else {
        this.notifySyncStatus({
          status: 'partial',
          message: `✓ Synced ${result.itemsSynced}, ✗ Failed ${result.itemsFailed}`
        })
      }
    } catch (error) {
      console.error('❌ Sync engine error:', error)
      result.success = false
      result.errors.push({
        id: 'sync-engine',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      this.notifySyncStatus({
        status: 'error',
        message: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Sync a single change
   */
  private async syncSingleChange(
    change: QueuedChange,
    result: SyncResult
  ): Promise<void> {
    switch (change.type) {
      case 'patient_create':
        await this.syncPatientCreate(change, result)
        break
      case 'patient_update':
        await this.syncPatientUpdate(change, result)
        break
      case 'form_submit':
        await this.syncFormSubmit(change, result)
        break
      case 'form_update':
        await this.syncFormUpdate(change, result)
        break
    }
  }

  /**
   * Sync patient creation
   */
  private async syncPatientCreate(
    change: QueuedChange,
    result: SyncResult
  ): Promise<void> {
    const patientData = change.data

    // Generate real Firestore document ID
    const patientRef = doc(collection(db, 'patients'))
    const realId = patientRef.id

    // Create patient in Firestore
    await setDoc(patientRef, {
      ...patientData,
      id: realId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedFromOffline: true,
      offlineId: change.tempId
    })

    // Store mapping
    if (change.tempId) {
      result.tempToRealIdMap.set(change.tempId, realId)
    }

    // Update all forms with new patient ID
    const forms = await offlineFormHandler.getPatientFormsOffline(
      change.tempId || change.patientId
    )
    for (const form of forms) {
      await offlineFormHandler.updateFormOffline(form.id, {
        ...form.formData,
        patientId: realId
      })
    }

    // Mark as synced
    await offlineQueue.markAsSynced(change.id, realId)

    console.log(`✓ Patient created: ${change.tempId} → ${realId}`)
  }

  /**
   * Sync patient update
   */
  private async syncPatientUpdate(
    change: QueuedChange,
    result: SyncResult
  ): Promise<void> {
    const patientRef = doc(db, 'patients', change.patientId)

    await updateDoc(patientRef, {
      ...change.data,
      updatedAt: serverTimestamp()
    })

    await offlineQueue.markAsSynced(change.id)

    console.log(`✓ Patient updated: ${change.patientId}`)
  }

  /**
   * Sync form submission
   */
  private async syncFormSubmit(
    change: QueuedChange,
    result: SyncResult
  ): Promise<void> {
    const formData = change.data
    const patientId = result.tempToRealIdMap.get(change.patientId) || change.patientId

    const formRef = doc(
      collection(db, 'patients', patientId, 'forms')
    )

    await setDoc(formRef, {
      ...formData,
      id: formRef.id,
      patientId: patientId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedFromOffline: true
    })

    // Mark form as synced
    await offlineFormHandler.markFormAsSynced(formData.id, patientId)
    await offlineQueue.markAsSynced(change.id)

    console.log(`✓ Form submitted: ${formData.id}`)
  }

  /**
   * Sync form update
   */
  private async syncFormUpdate(
    change: QueuedChange,
    result: SyncResult
  ): Promise<void> {
    const formData = change.data
    const patientId = result.tempToRealIdMap.get(change.patientId) || change.patientId

    const formRef = doc(
      db,
      'patients',
      patientId,
      'forms',
      formData.id
    )

    await updateDoc(formRef, {
      ...formData,
      updatedAt: serverTimestamp()
    })

    await offlineQueue.markAsSynced(change.id)

    console.log(`✓ Form updated: ${formData.id}`)
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pending: number
    failed: number
    totalInQueue: number
  }> {
    const stats = await offlineQueue.getQueueStats()
    return {
      pending: stats.pending,
      failed: stats.failed,
      totalInQueue: stats.total
    }
  }
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'partial' | 'error'
  message: string
  progress?: number
  total?: number
}

// Export singleton instance
export const advancedSyncEngine = new AdvancedSyncEngine()
