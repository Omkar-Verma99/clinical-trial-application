/**
 * Offline Patient Management
 * 
 * Allows creating new patients offline with sync queue
 * When online, new patients are validated and synced to server
 */

'use client'

interface OfflinePatient {
  id: string // Temporary offline ID
  name: string
  dateOfBirth: string
  patientId: string
  email?: string
  phone?: string
  doctorId: string
  createdAt: number // Timestamp
  synced: boolean
  syncError?: string
}

interface PatientSyncQueue {
  patientId: string
  action: 'create' | 'update'
  data: Partial<OfflinePatient>
  timestamp: number
  retries: number
}

class OfflinePatientManager {
  private static readonly DB_NAME = 'clinical-trial-db'
  private static readonly PATIENT_STORE = 'offline_patients'
  private static readonly SYNC_QUEUE_STORE = 'patient_sync_queue'
  private static readonly MAX_RETRIES = 3

  /**
   * Create a new patient offline
   * Patient is queued for sync when online
   */
  static async createPatientOffline(
    doctorId: string,
    patientData: Omit<OfflinePatient, 'id' | 'createdAt' | 'synced' | 'syncError'>
  ): Promise<{ success: boolean; patientId?: string; error?: string }> {
    try {
      // Validate patient data
      if (!patientData.name?.trim()) {
        return { success: false, error: 'Patient name is required' }
      }
      if (!patientData.patientId?.trim()) {
        return { success: false, error: 'Patient ID is required' }
      }
      if (!patientData.dateOfBirth) {
        return { success: false, error: 'Date of birth is required' }
      }

      // CHECK FOR DUPLICATE PATIENT ID IN INDEXEDDB
      const existingPatient = await this.getPatientByIdOffline(patientData.patientId, doctorId)
      if (existingPatient) {
        return {
          success: false,
          error: `Patient with ID "${patientData.patientId}" already exists for you. Each patient must have a unique ID.`,
        }
      }

      const db = await this.openDB()
      const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const newPatient: OfflinePatient = {
        id: offlineId,
        ...patientData,
        doctorId,
        createdAt: Date.now(),
        synced: false,
      }

      // Store locally
      const transaction = db.transaction([this.PATIENT_STORE, this.SYNC_QUEUE_STORE], 'readwrite')
      
      // Add to patients store
      const patientStore = transaction.objectStore(this.PATIENT_STORE)
      await patientStore.add(newPatient)

      // Add to sync queue
      const syncQueueStore = transaction.objectStore(this.SYNC_QUEUE_STORE)
      await syncQueueStore.add({
        patientId: offlineId,
        action: 'create',
        data: newPatient,
        timestamp: Date.now(),
        retries: 0,
      } as PatientSyncQueue)

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Patient created offline:', offlineId)
        console.log('✓ Added to sync queue - will sync when online')
        console.log('✓ Duplicate check passed for patient ID:', patientData.patientId)
      }

      return { success: true, patientId: offlineId }
    } catch (error) {
      console.error('Failed to create patient offline:', error)
      return {
        success: false,
        error: `Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get patient by ID from offline storage
   * Used for duplicate checking
   */
  private static async getPatientByIdOffline(
    patientId: string,
    doctorId: string
  ): Promise<OfflinePatient | null> {
    try {
      const db = await this.openDB()
      const store = db.transaction(this.PATIENT_STORE, 'readonly').objectStore(this.PATIENT_STORE)
      
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const all = request.result as OfflinePatient[]
          // Find patient with same ID and same doctor
          const found = all.find(
            p => p.patientId === patientId && p.doctorId === doctorId
          )
          resolve(found || null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to check for duplicate patient ID:', error)
      return null
    }
  }

  /**
   * Check if patient ID exists in ANY form (offline or pending sync)
   */
  static async patientIdExists(patientId: string, doctorId: string): Promise<boolean> {
    try {
      const existing = await this.getPatientByIdOffline(patientId, doctorId)
      return !!existing
    } catch (error) {
      console.error('Error checking if patient ID exists:', error)
      return false
    }
  }

  /**
   * Validate patient data before creation
   * Returns validation errors if any
   */
  static async validatePatientData(
    patientData: Partial<OfflinePatient>,
    doctorId: string
  ): Promise<string[]> {
    const errors: string[] = []

    // Check required fields
    if (!patientData.name?.trim()) {
      errors.push('Patient name is required')
    }

    if (!patientData.patientId?.trim()) {
      errors.push('Patient ID is required')
    } else {
      // Check for duplicates
      const exists = await this.patientIdExists(patientData.patientId, doctorId)
      if (exists) {
        errors.push(
          `Patient with ID "${patientData.patientId}" already exists. Each patient must have a unique ID.`
        )
      }
    }

    if (!patientData.dateOfBirth) {
      errors.push('Date of birth is required')
    }

    // Optional: validate date format
    if (patientData.dateOfBirth) {
      const date = new Date(patientData.dateOfBirth)
      if (isNaN(date.getTime())) {
        errors.push('Date of birth is invalid')
      }
    }

    return errors
  }
  static async getOfflinePatients(doctorId: string): Promise<OfflinePatient[]> {
    try {
      const db = await this.openDB()
      const store = db.transaction(this.PATIENT_STORE, 'readonly').objectStore(this.PATIENT_STORE)
      
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const all = request.result as OfflinePatient[]
          const filtered = all.filter(p => p.doctorId === doctorId)
          resolve(filtered)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get offline patients:', error)
      return []
    }
  }

  /**
   * Check if there are pending syncs
   */
  static async hasPendingSyncs(): Promise<boolean> {
    try {
      const db = await this.openDB()
      const store = db.transaction(this.SYNC_QUEUE_STORE, 'readonly').objectStore(this.SYNC_QUEUE_STORE)
      
      return new Promise((resolve, reject) => {
        const request = store.count()
        request.onsuccess = () => resolve(request.result > 0)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to check pending syncs:', error)
      return false
    }
  }

  /**
   * Get sync queue for offline patients
   * Used when coming back online to sync
   */
  static async getSyncQueue(): Promise<PatientSyncQueue[]> {
    try {
      const db = await this.openDB()
      const store = db.transaction(this.SYNC_QUEUE_STORE, 'readonly').objectStore(this.SYNC_QUEUE_STORE)
      
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          const queue = request.result as PatientSyncQueue[]
          // Sort by timestamp (oldest first)
          resolve(queue.sort((a, b) => a.timestamp - b.timestamp))
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get sync queue:', error)
      return []
    }
  }

  /**
   * Mark patient as synced
   * Called after successful server validation
   */
  static async markPatientSynced(offlineId: string, serverId?: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.PATIENT_STORE, this.SYNC_QUEUE_STORE], 'readwrite')

      // Update patient: mark as synced
      const patientStore = transaction.objectStore(this.PATIENT_STORE)
      const patient = await new Promise<OfflinePatient>((resolve, reject) => {
        const request = patientStore.get(offlineId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (patient) {
        patient.synced = true
        if (serverId) {
          patient.id = serverId // Update with actual server ID
        }
        patientStore.put(patient)
      }

      // Remove from sync queue
      const syncQueueStore = transaction.objectStore(this.SYNC_QUEUE_STORE)
      const queueItems = await new Promise<PatientSyncQueue[]>((resolve, reject) => {
        const request = syncQueueStore.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      queueItems
        .filter(item => item.patientId === offlineId)
        .forEach(item => syncQueueStore.delete(item.patientId))

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Patient marked as synced:', offlineId)
      }
    } catch (error) {
      console.error('Failed to mark patient as synced:', error)
    }
  }

  /**
   * Handle sync error
   * Increments retry count
   */
  static async handleSyncError(
    offlineId: string,
    error: string
  ): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.PATIENT_STORE, this.SYNC_QUEUE_STORE], 'readwrite')

      // Update patient with error
      const patientStore = transaction.objectStore(this.PATIENT_STORE)
      const patient = await new Promise<OfflinePatient>((resolve, reject) => {
        const request = patientStore.get(offlineId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (patient) {
        patient.syncError = error
        patientStore.put(patient)
      }

      // Update sync queue with retry count
      const syncQueueStore = transaction.objectStore(this.SYNC_QUEUE_STORE)
      const queueItem = await new Promise<PatientSyncQueue>((resolve, reject) => {
        const request = syncQueueStore.get(offlineId)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (queueItem) {
        queueItem.retries++
        if (queueItem.retries >= this.MAX_RETRIES) {
          console.error(`Max retries reached for patient: ${offlineId}`)
          syncQueueStore.delete(offlineId)
        } else {
          syncQueueStore.put(queueItem)
        }
      }
    } catch (err) {
      console.error('Failed to handle sync error:', err)
    }
  }

  /**
   * Clear offline patients (use with caution)
   */
  static async clearOfflinePatients(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.PATIENT_STORE, this.SYNC_QUEUE_STORE], 'readwrite')
      transaction.objectStore(this.PATIENT_STORE).clear()
      transaction.objectStore(this.SYNC_QUEUE_STORE).clear()
    } catch (error) {
      console.error('Failed to clear offline patients:', error)
    }
  }

  /**
   * Open IndexedDB connection
   */
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create offline patients store
        if (!db.objectStoreNames.contains(this.PATIENT_STORE)) {
          const patientStore = db.createObjectStore(this.PATIENT_STORE, { keyPath: 'id' })
          patientStore.createIndex('doctorId', 'doctorId', { unique: false })
          patientStore.createIndex('synced', 'synced', { unique: false })
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(this.SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(this.SYNC_QUEUE_STORE, { keyPath: 'patientId' })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('retries', 'retries', { unique: false })
        }
      }
    })
  }
}

export { OfflinePatientManager, type OfflinePatient, type PatientSyncQueue }
