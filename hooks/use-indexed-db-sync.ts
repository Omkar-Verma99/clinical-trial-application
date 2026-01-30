/**
 * useIndexedDBSync Hook - React Integration for IndexedDB Offline-First
 * 
 * GUARANTEES:
 * ✓ Form data saved to IndexedDB immediately (0ms feedback)
 * ✓ Firebase sync happens in background (non-blocking)
 * ✓ Real-time updates from server reflected in IndexedDB
 * ✓ Automatic retry on network restoration
 * ✓ Draft management with load/delete
 * ✓ Conflict resolution for offline edits
 * 
 * USAGE:
 * const { saveFormData, loadDrafts, syncStatus } = useIndexedDBSync(patientId)
 * 
 * // On form submit
 * await saveFormData(formId, 'baseline', data, isDraft)
 * 
 * // Load drafts list
 * const drafts = await loadDrafts()
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { indexedDBService, type StoredFormData, type SyncQueueItem } from '@/lib/indexeddb-service'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, getDocs, getDoc } from 'firebase/firestore'
import { registerBackgroundSync } from '@/lib/background-sync'
import { generateChecksum, detectConflict } from '@/lib/conflict-detection'

// Helper to detect development environment safely on client-side
const isDevelopmentEnv = () => typeof window !== 'undefined' && window.location.hostname === 'localhost'

interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingItems: number
  lastSyncTime: string | null
  errors: string[]
}

export function useIndexedDBSync(patientId: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingItems: 0,
    lastSyncTime: null,
    errors: [],
  })

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const lastSeenDataRef = useRef<Map<string, any>>(new Map())
  const performSyncRef = useRef<(() => void) | null>(null)
  const syncStatusRef = useRef<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingItems: 0,
    lastSyncTime: null,
    errors: [],
  })
  const isTabVisibleRef = useRef<boolean>(true)
  const listenerRestartRef = useRef<(() => void) | null>(null)

  /**
   * Initialize IndexedDB and set up listeners
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        await indexedDBService.initialize()
        updateSyncStatus()

        // Set up online/offline listeners
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        
        // Set up tab visibility listener (handles network suspension)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Start background sync
        startBackgroundSync()

        // Set up real-time listeners for Firebase changes
        setupRealtimeSync()

        if (isDevelopmentEnv()) {
          console.log('✓ IndexedDB sync initialized for patient:', patientId)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Initialization failed'
        if (isDevelopmentEnv()) {
          console.error('IndexedDB sync initialization error:', errorMsg)
        }
        addError(errorMsg)
      }
    }

    initialize()

    return () => {
      // CRITICAL: Clean up listeners BEFORE creating new ones
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [patientId])

  /**
   * Update sync status
   */
  const updateSyncStatus = useCallback(async () => {
    try {
      const stats = await indexedDBService.getStats()
      setSyncStatus(prev => ({
        ...prev,
        pendingItems: stats.pendingSync,
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update stats'
      if (isDevelopmentEnv()) {
        console.error('Sync status error:', errorMsg)
      }
    }
  }, [])

  /**
   * Add error to sync status
   */
  const addError = useCallback((error: string) => {
    setSyncStatus(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-4), error], // Keep last 5 errors
    }))
  }, [])

  /**
   * Handle online event - trigger sync
   * Uses useRef callback to avoid circular dependency with performSync
   */
  const handleOnline = useCallback(() => {
    setSyncStatus(prev => ({ ...prev, isOnline: true }))
    // Defer to performSync via ref to avoid circular dependency
    if (performSyncRef.current) {
      performSyncRef.current()
    }
  }, [])

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    setSyncStatus(prev => ({ ...prev, isOnline: false }))
  }, [])

  /**
   * Handle tab visibility changes - restart listeners when tab becomes visible
   * Fixes: net::ERR_NETWORK_IO_SUSPENDED when switching tabs
   */
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden
    isTabVisibleRef.current = isVisible

    if (isVisible && syncStatusRef.current.isOnline) {
      // Tab became visible and we're online - restart listeners and sync
      if (isDevelopmentEnv()) {
        console.log('📱 Tab became visible - restarting Firebase listeners')
      }
      
      // Unsubscribe from old listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // Restart listeners
      if (listenerRestartRef.current) {
        listenerRestartRef.current()
      }

      // Trigger sync for any pending items
      if (performSyncRef.current) {
        performSyncRef.current()
      }
    }
  }, [])

  /**
   * Main sync function - sends queued items to Firebase
   * V4 Schema: Writes baseline & followups to unified /patients/{patientId} document
   */
  const performSync = useCallback(async () => {
    // Use ref to check status instead of state dependency to avoid constant recreations
    if (syncStatusRef.current.isSyncing || !syncStatusRef.current.isOnline) {
      return
    }

    setSyncStatus(prev => {
      syncStatusRef.current = { ...prev, isSyncing: true }
      return syncStatusRef.current
    })

    try {
      const pendingItems = await indexedDBService.getPendingSyncItems()

      if (pendingItems.length === 0) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date().toISOString(),
        }))
        return
      }

      if (isDevelopmentEnv()) {
        console.log(`🔄 Syncing ${pendingItems.length} items to Firebase (V4 unified schema)`)
      }

      // Group items by patientId for efficient batch writes
      const itemsByPatient = new Map<string, typeof pendingItems>()
      
      for (const item of pendingItems) {
        const patientId = item.patientId || ''
        if (!patientId) {
          await indexedDBService.recordSyncFailure(item.id, 'Missing patientId - cannot sync')
          continue
        }
        
        if (!itemsByPatient.has(patientId)) {
          itemsByPatient.set(patientId, [])
        }
        itemsByPatient.get(patientId)!.push(item)
      }

      // Process each patient's data
      for (const [patientId, items] of itemsByPatient.entries()) {
        try {
          // Load all forms for this patient
          const baselineForm = items.find(i => i.formType === 'baseline')
          const followupForms = items.filter(i => i.formType === 'followup')

          // Load baseline data
          let baselineData = undefined
          if (baselineForm) {
            const baselineDb = await indexedDBService.loadForm(baselineForm.formId || '', patientId)
            if (baselineDb?.data) {
              // Copy data before mutation to avoid modifying IndexedDB cache
              baselineData = { ...baselineDb.data }
              delete (baselineData as any).createdAt // Don't overwrite server createdAt
            }
          }

          // Load followup data
          const followupsData: any[] = []
          for (const followupForm of followupForms) {
            const followupDb = await indexedDBService.loadForm(followupForm.formId || '', patientId)
            if (followupDb?.data) {
              // Copy data before mutation to avoid modifying IndexedDB cache
              const followupData = { ...followupDb.data }
              delete (followupData as any).createdAt // Don't overwrite server createdAt
              followupsData.push(followupData)
            }
          }

          // V4 UNIFIED SCHEMA: Update /patients/{patientId} with baseline & followups
          const patientRef = doc(db, 'patients', patientId)
          const updateData: Record<string, any> = {
            updatedAt: new Date().toISOString(),
          }

          // Add baseline if exists
          if (baselineData) {
            updateData.baseline = baselineData
            if (isDevelopmentEnv()) {
              console.log(`📝 Syncing baseline for patient ${patientId}`)
            }
          }

          // Add followups if exist (replace entire array)
          if (followupsData.length > 0) {
            updateData.followups = followupsData
            if (isDevelopmentEnv()) {
              console.log(`📝 Syncing ${followupsData.length} followup(s) for patient ${patientId}`)
            }
          }

          // GUARD: Skip write if nothing to sync (only updatedAt is not useful)
          if (!baselineData && followupsData.length === 0) {
            if (isDevelopmentEnv()) {
              console.log(`⏭️ Skipping sync for patient ${patientId} - no baseline or followups to sync`)
            }
            for (const item of items) {
              await indexedDBService.markAsSynced(item.id)
            }
            return
          }

          // CRITICAL FIX #2: Check for conflicts before writing
          // Prevents overwriting server changes with stale local data
          try {
            const serverDocRef = doc(db, 'patients', patientId)
            const serverDoc = await getDoc(serverDocRef)
            
            if (serverDoc.exists()) {
              const serverData = serverDoc.data()
              const localChecksum = generateChecksum(updateData)
              const serverChecksum = generateChecksum(serverData)
              
              if (localChecksum !== serverChecksum) {
                // Data differs - check for conflicts
                const conflict = await detectConflict(
                  updateData,
                  serverData,
                  updateData._version || 0,
                  serverData._version || 0
                )
                
                if (conflict.hasConflict && conflict.resolution === 'use-server') {
                  if (isDevelopmentEnv()) {
                    console.warn(`⚠️ Conflict detected for patient ${patientId} - skipping sync (server version preferred)`)
                  }
                  // Don't write - server version is newer/better
                  for (const item of items) {
                    await indexedDBService.markAsSynced(item.id)
                  }
                  return
                }
                
                // Mark data with new version to indicate this is newer write
                updateData._version = (serverData._version || 0) + 1
                updateData._syncChecksum = localChecksum
                
                if (isDevelopmentEnv()) {
                  console.log(`🔄 Conflict resolution: using local version ${updateData._version}`)
                }
              }
            }
          } catch (conflictCheckError) {
            if (isDevelopmentEnv()) {
              console.warn('⚠️ Could not check for conflicts, proceeding with sync:', conflictCheckError)
            }
            // Continue anyway - this shouldn't block sync
          }

          // Single write to unified patient document
          await updateDoc(patientRef, updateData)

          if (isDevelopmentEnv()) {
            console.log(`✓ Patient ${patientId} synced to V4 unified schema`)
          }

          // Mark all items for this patient as synced
          for (const item of items) {
            await indexedDBService.markAsSynced(item.id)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Sync error'
          
          // Mark failed items
          for (const item of items) {
            await indexedDBService.recordSyncFailure(item.id, errorMsg)
          }
          
          addError(`Failed to sync patient ${patientId}: ${errorMsg}`)
          if (isDevelopmentEnv()) {
            console.error(`Sync failed for patient ${patientId}:`, errorMsg)
          }
        }
      }

      await updateSyncStatus()
      setSyncStatus(prev => {
        syncStatusRef.current = { ...prev, isSyncing: false, lastSyncTime: new Date().toISOString() }
        return syncStatusRef.current
      })

      if (isDevelopmentEnv()) {
        console.log('✓ Sync cycle complete (V4 unified schema)')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sync failed'
      setSyncStatus(prev => {
        syncStatusRef.current = { ...prev, isSyncing: false }
        return syncStatusRef.current
      })
      addError(errorMsg)
      if (isDevelopmentEnv()) {
        console.error('Sync error:', errorMsg)
      }
    }
  }, [updateSyncStatus, addError])

  // Store performSync in ref for handleOnline callback to use without circular dependency
  useEffect(() => {
    performSyncRef.current = performSync
  }, [performSync])

  /**
   * Start event-driven sync (NO POLLING)
   * Sync only happens when:
   * 1. Form is submitted
   * 2. Network comes online
   * 3. Firebase data changes (real-time listener)
   */
  const startBackgroundSync = useCallback(() => {
    // Clear any existing polling interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }
    
    if (isDevelopmentEnv()) {
      console.log('✅ Event-driven sync active - NO polling, only on-demand')
    }
    
    // Sync will be triggered by:
    // - handleOnline() when network available
    // - Firebase onSnapshot listeners
    // - Form submission (saveFormData)
  }, [])

  /**
   * Save form data to IndexedDB (main entry point)
   */
  const saveFormData = useCallback(
    async (
      formId: string,
      formType: 'baseline' | 'followup' | 'patient',
      data: any,
      isDraft: boolean = false,
      validationErrors: string[] = []
    ) => {
      try {
        const result = await indexedDBService.saveForm(
          formId,
          formType,
          patientId,
          data,
          isDraft,
          validationErrors
        )

        if (isDevelopmentEnv()) {
          console.log(`✓ Form data saved: ${formId}`, { isDraft })
        }
        await updateSyncStatus()

        // Register background sync (will sync even if app closes)
        // Battery efficient - browser triggers it when online
        await registerBackgroundSync()

        // Trigger sync if online and not a draft (use ref for current state)
        if (!isDraft && syncStatusRef.current.isOnline) {
          setTimeout(() => performSyncRef.current?.(), 100)
        }

        return { success: true, error: null }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Save failed'
        addError(errorMsg)
        throw error
      }
    },
    [patientId, updateSyncStatus, performSync, addError]
  )

  /**
   * Load drafts for patient
   */
  const loadDrafts = useCallback(async (): Promise<StoredFormData[]> => {
    try {
      return await indexedDBService.loadPatientDrafts(patientId)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load drafts'
      addError(errorMsg)
      return []
    }
  }, [patientId, addError])

  /**
   * Load specific draft
   */
  const loadDraft = useCallback(
    async (formId: string): Promise<StoredFormData | null> => {
      try {
        return await indexedDBService.loadForm(formId)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load draft'
        addError(errorMsg)
        return null
      }
    },
    [addError]
  )

  /**
   * Delete/clear a draft
   */
  const deleteDraft = useCallback(async (formId: string) => {
    try {
      await indexedDBService.clearDraft(formId)
      await updateSyncStatus()
      if (isDevelopmentEnv()) {
        console.log(`✓ Draft deleted: ${formId}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete draft'
      addError(errorMsg)
      throw error
    }
  }, [updateSyncStatus, addError])

  /**
   * Set up real-time listeners for Firebase changes
   * Syncs Firebase data to IndexedDB immediately
   * 
   * NOTE: Skips listener setup if patientId is empty (useful during patient creation)
   */
  const setupRealtimeSync = useCallback(() => {
    // Skip listener setup if patientId is empty/invalid
    if (!patientId || patientId.trim() === "") {
      if (isDevelopmentEnv()) {
        console.log('⏭️  Skipping real-time sync - no patientId provided')
      }
      return
    }

    // CRITICAL: Check if Firebase is initialized
    if (!db) {
      if (isDevelopmentEnv()) {
        console.error('⏭️  Skipping real-time sync - Firebase not initialized')
      }
      addError('Firebase not initialized')
      return
    }

    const unsubscribers: Array<() => void> = []

    try {
      // V4 SCHEMA: Listen to unified PATIENT document (all data in one place)
      // Contains: baseline + followups arrays in single patient doc
      const patientDocRef = doc(db, 'patients', patientId)
      
      const unsubscribePatient = onSnapshot(
        patientDocRef,
        async (docSnapshot) => {
          try {
            if (!docSnapshot.exists()) {
              if (isDevelopmentEnv()) {
                console.log('Patient document not found:', patientId)
              }
              return
            }

            const patientData = docSnapshot.data()
            const serverUpdatedAt = patientData?.updatedAt || new Date().toISOString()

            // CRITICAL FIX #1: Don't overwrite if local data is newer
            // This prevents the real-time listener from reverting user's fresh saves
            const localPatient = await indexedDBService.getPatient(patientId)
            if (localPatient?.patientInfo?.updatedAt) {
              // Proper timestamp comparison (not string comparison!)
              const localTime = new Date(localPatient.patientInfo.updatedAt).getTime()
              const serverTime = new Date(serverUpdatedAt).getTime()
              if (localTime > serverTime) {
                if (isDevelopmentEnv()) {
                  console.log(`⏭️ Skipping listener update - local data is newer (local: ${localPatient.patientInfo.updatedAt} vs server: ${serverUpdatedAt})`)
                }
                return
              }
            }

            // Save patient info
            await indexedDBService.saveForm(
              patientId,
              'patient',
              patientId,
              patientData,
              false,
              []
            )

            // Save baseline data (if exists in patient doc)
            if (patientData.baseline) {
              await indexedDBService.saveForm(
                patientId,
                'baseline',
                patientId,
                patientData.baseline,
                false,
                []
              )
              if (isDevelopmentEnv()) {
                console.log('✓ Real-time sync: baseline data updated')
              }
            }

            // Save all followup data (array in patient doc)
            if (patientData.followups && Array.isArray(patientData.followups)) {
              for (let i = 0; i < patientData.followups.length; i++) {
                const followupData = patientData.followups[i]
                await indexedDBService.saveForm(
                  `${patientId}-followup-${i}`,
                  'followup',
                  patientId,
                  followupData,
                  false,
                  []
                )
              }
              if (isDevelopmentEnv()) {
                console.log(`✓ Real-time sync: ${patientData.followups.length} followup records`)
              }
            }

            if (isDevelopmentEnv()) {
              console.log('✓ Real-time sync: patient data synced from unified schema')
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Sync error'
            if (isDevelopmentEnv()) {
              console.error('Error syncing patient data:', errorMsg)
            }
            addError(`Patient data sync error: ${errorMsg}`)
          }
        },
        (error) => {
          const errorMsg = error instanceof Error ? error.message : 'Listener error'
          if (isDevelopmentEnv()) {
            console.error('Patient listener error:', errorMsg)
          }
          addError(`Patient listener failed: ${errorMsg}`)
        }
      )
      unsubscribers.push(unsubscribePatient)

      // Store ALL unsubscribers
      unsubscribeRef.current = () => {
        unsubscribers.forEach(unsub => unsub())
      }

      // Store restart function for tab visibility changes
      listenerRestartRef.current = setupRealtimeSync

      if (isDevelopmentEnv()) {
        console.log('✓ Real-time listener set up for unified patient schema:', patientId)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Real-time sync setup failed'
      if (isDevelopmentEnv()) {
        console.error('Real-time sync setup error:', errorMsg)
      }
      addError(errorMsg)
    }
  }, [patientId, addError])

  /**
   * Manually trigger sync
   */
  const triggerSync = useCallback(async () => {
    if (syncStatus.isOnline) {
      await performSync()
    } else {
      addError('Cannot sync while offline')
    }
  }, [syncStatus.isOnline, performSync, addError])

  return {
    syncStatus,
    saveFormData,
    loadDrafts,
    loadDraft,
    deleteDraft,
    triggerSync,
  }
}

