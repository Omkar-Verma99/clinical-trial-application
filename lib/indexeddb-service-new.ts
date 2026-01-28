/**
 * IndexedDB Service for Clinical Trial Application - PATIENT-CENTRIC V4
 * 
 * ARCHITECTURE:
 * - Single unified PATIENT_DATA_STORE with all data for a patient
 * - PatientDataRecord contains: patient info + baseline + all followups
 * - Key by patientId for instant patient data retrieval
 * - All patient forms grouped together in one record
 * 
 * DATA STRUCTURE PER PATIENT:
 * {
 *   patientId: "6XPs02Xos4sPJmsFsQzI",
 *   doctorId: "FFETvwt43aeYOaWB0HC7rrpALdW2",
 *   patientInfo: { name, dob, age, gender, ... },
 *   baseline: { formId, status, fields... },
 *   followups: [ { formId, visitDate, status, fields... }, ... ],
 *   metadata: { lastSynced, isDirty, ... }
 * }
 * 
 * BENEFITS:
 * ✓ Load all patient data in ONE query
 * ✓ No scattered individual form records
 * ✓ Natural offline-first structure
 * ✓ Atomic updates per patient
 */

// === UNIFIED PATIENT DATA RECORD ===
interface PatientDataRecord {
  patientId: string              // Primary key
  doctorId: string               // For multi-doctor filtering
  patientInfo: {
    id?: string
    patientCode: string
    firstName: string
    lastName: string
    email: string
    dob: string
    age: number
    gender: string
    durationOfDiabetes: number
    createdAt: string
    updatedAt: string
  }
  baseline: BaselineFormData | null
  followups: FollowupFormData[]  // Array of all followup visits
  metadata: {
    lastSynced: string | null
    isDirty: boolean
    syncError: string | null
  }
}

// === BASELINE FORM DATA ===
interface BaselineFormData {
  formId: string
  status: 'draft' | 'submitted'
  weight: number
  height: number
  bmi: number
  systolicBP: number
  diastolicBP: number
  [key: string]: any
  createdAt: string
  updatedAt: string
  syncedToFirebaseAt: string | null
}

// === FOLLOWUP FORM DATA ===
interface FollowupFormData {
  formId: string
  visitNumber: number
  visitDate: string
  status: 'draft' | 'submitted'
  weight: number
  systolicBP: number
  diastolicBP: number
  [key: string]: any
  createdAt: string
  updatedAt: string
  syncedToFirebaseAt: string | null
}

interface SyncQueueItem {
  id: string
  patientId: string
  dataType: 'patient' | 'baseline' | 'followup'
  action: 'create' | 'update' | 'merge'
  data: Partial<PatientDataRecord>
  createdAt: string
  retryCount: number
  maxRetries: number
  backoffMs: number
  status: 'pending' | 'syncing' | 'failed' | 'synced'
  lastError?: string
}

const DB_NAME = 'Kollectcare_RWE'
const DB_VERSION = 4
const PATIENT_DATA_STORE = 'patientData'
const SYNC_QUEUE_STORE = 'syncQueue'
const METADATA_STORE = 'metadata'

class IndexedDBService {
  private db: IDBDatabase | null = null
  private isInitialized = false
  private syncInProgress = false

  /**
   * Initialize IndexedDB with patient-centric schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          const error = request.error?.message || 'Unknown database error'
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.error('IndexedDB initialization failed:', error)
          }
          reject(new Error(`Failed to initialize IndexedDB: ${error}`))
        }

        request.onsuccess = () => {
          this.db = request.result
          this.isInitialized = true
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log('✓ IndexedDB initialized successfully (v4 patient-centric schema)')
          }
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result

          // UNIFIED PATIENT DATA STORE
          if (!db.objectStoreNames.contains(PATIENT_DATA_STORE)) {
            const store = db.createObjectStore(PATIENT_DATA_STORE, { keyPath: 'patientId' })
            store.createIndex('doctorId', 'doctorId', { unique: false })
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('✓ Created unified patient data store')
            }
          }

          // SYNC QUEUE STORE
          if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' })
            syncStore.createIndex('status', 'status', { unique: false })
            syncStore.createIndex('patientId', 'patientId', { unique: false })
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('✓ Created sync queue store')
            }
          }

          // METADATA STORE
          if (!db.objectStoreNames.contains(METADATA_STORE)) {
            db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
          }

          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log('✓ Database schema upgraded to v4')
          }
        }
      })
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('IndexedDB initialization error:', error)
      }
      throw error
    }
  }

  /**
   * Get all patients for a doctor
   */
  async getPatientsByDoctor(doctorId: string): Promise<PatientDataRecord[]> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readonly')
      const store = transaction.objectStore(PATIENT_DATA_STORE)
      const index = store.index('doctorId')
      const request = index.getAll(doctorId)

      request.onsuccess = () => {
        const patients = request.result as PatientDataRecord[]
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log(`✓ Loaded ${patients.length} patients for doctor: ${doctorId}`)
        }
        resolve(patients)
      }

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to load patients'))
      }
    })
  }

  /**
   * Get a single patient's complete data
   */
  async getPatient(patientId: string): Promise<PatientDataRecord | null> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readonly')
      const store = transaction.objectStore(PATIENT_DATA_STORE)
      const request = store.get(patientId)

      request.onsuccess = () => {
        const patient = request.result as PatientDataRecord | undefined
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && patient) {
          console.log(`✓ Loaded patient: ${patientId} (baseline: ${patient.baseline ? '✓' : '✗'}, followups: ${patient.followups?.length || 0})`)
        }
        resolve(patient || null)
      }

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to load patient'))
      }
    })
  }

  /**
   * Save complete patient data (patient info + baseline + followups)
   */
  async savePatient(patientData: PatientDataRecord): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE, SYNC_QUEUE_STORE], 'readwrite')
      const patientStore = transaction.objectStore(PATIENT_DATA_STORE)
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE)

      // Save patient data
      const putRequest = patientStore.put(patientData)

      putRequest.onsuccess = () => {
        // Add to sync queue
        const syncItem: SyncQueueItem = {
          id: `${patientData.patientId}-${Date.now()}`,
          patientId: patientData.patientId,
          dataType: 'patient',
          action: 'update',
          data: patientData,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          backoffMs: 1000,
          status: 'pending',
        }

        const syncRequest = syncStore.put(syncItem)
        syncRequest.onsuccess = () => {
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log(`✓ Patient saved: ${patientData.patientId} (baseline: ${patientData.baseline ? '✓' : '✗'}, followups: ${patientData.followups?.length || 0})`)
          }
          resolve()
        }

        syncRequest.onerror = () => {
          reject(new Error(syncRequest.error?.message || 'Failed to add to sync queue'))
        }
      }

      putRequest.onerror = () => {
        reject(new Error(putRequest.error?.message || 'Failed to save patient'))
      }
    })
  }

  /**
   * Add followup form to existing patient data
   */
  async addFollowupForm(patientId: string, followupData: FollowupFormData): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE, SYNC_QUEUE_STORE], 'readwrite')
      const patientStore = transaction.objectStore(PATIENT_DATA_STORE)
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE)

      const getRequest = patientStore.get(patientId)

      getRequest.onsuccess = () => {
        const patient = getRequest.result as PatientDataRecord
        if (!patient) {
          reject(new Error(`Patient ${patientId} not found`))
          return
        }

        // Add followup to array
        if (!patient.followups) {
          patient.followups = []
        }
        patient.followups.push(followupData)
        patient.metadata.isDirty = true
        patient.metadata.lastSynced = null

        // Save updated patient
        const putRequest = patientStore.put(patient)

        putRequest.onsuccess = () => {
          // Add to sync queue
          const syncItem: SyncQueueItem = {
            id: `${patientId}-followup-${Date.now()}`,
            patientId,
            dataType: 'followup',
            action: 'update',
            data: { followups: patient.followups },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 5,
            backoffMs: 1000,
            status: 'pending',
          }

          const syncRequest = syncStore.put(syncItem)
          syncRequest.onsuccess = () => {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log(`✓ Followup added to patient: ${patientId} (total followups: ${patient.followups.length})`)
            }
            resolve()
          }

          syncRequest.onerror = () => {
            reject(new Error(syncRequest.error?.message || 'Failed to add to sync queue'))
          }
        }

        putRequest.onerror = () => {
          reject(new Error(putRequest.error?.message || 'Failed to update patient'))
        }
      }

      getRequest.onerror = () => {
        reject(new Error(getRequest.error?.message || 'Failed to load patient'))
      }
    })
  }

  /**
   * Get all pending sync items
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readonly')
      const store = transaction.objectStore(SYNC_QUEUE_STORE)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        resolve(request.result as SyncQueueItem[])
      }

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to load sync queue'))
      }
    })
  }

  /**
   * Mark sync item as synced
   */
  async markSynced(syncItemId: string): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE)
      const getRequest = store.get(syncItemId)

      getRequest.onsuccess = () => {
        const item = getRequest.result as SyncQueueItem
        if (item) {
          item.status = 'synced'
          const putRequest = store.put(item)

          putRequest.onsuccess = () => {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log(`✓ Sync item marked as synced: ${syncItemId}`)
            }
            resolve()
          }

          putRequest.onerror = () => {
            reject(new Error(putRequest.error?.message))
          }
        } else {
          reject(new Error(`Sync item ${syncItemId} not found`))
        }
      }

      getRequest.onerror = () => {
        reject(new Error(getRequest.error?.message))
      }
    })
  }

  /**
   * Clear all IndexedDB data on logout
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      const storeNames = [PATIENT_DATA_STORE, SYNC_QUEUE_STORE, METADATA_STORE]
      const transaction = this.db!.transaction(storeNames, 'readwrite')

      for (const storeName of storeNames) {
        try {
          const store = transaction.objectStore(storeName)
          const clearRequest = store.clear()

          clearRequest.onsuccess = () => {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log(`✓ Cleared store: ${storeName}`)
            }
          }

          clearRequest.onerror = () => {
            console.error(`Error clearing store: ${storeName}`, clearRequest.error)
          }
        } catch (error) {
          console.error(`Error accessing store: ${storeName}`, error)
        }
      }

      transaction.oncomplete = () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log('✓ All IndexedDB data cleared')
        }
        resolve()
      }

      transaction.onerror = () => {
        console.error('Error clearing IndexedDB:', transaction.error)
        reject(transaction.error)
      }
    })
  }
}

export const indexedDBService = new IndexedDBService()
export type { PatientDataRecord, BaselineFormData, FollowupFormData, SyncQueueItem }
