/**
 * IndexedDB Service for Clinical Trial Application - PATIENT-CENTRIC V4
 * 
 * SINGLE UNIFIED DATA STRUCTURE:
 * One record per patient containing all their data:
 * {
 *   patientId, doctorId, patientInfo, baseline, followups, metadata
 * }
 * 
 * NO MORE scattered individual form records!
 */

interface PatientDataRecord {
  patientId: string
  doctorId: string
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
  followups: FollowupFormData[]
  metadata: {
    lastSynced: string | null
    isDirty: boolean
    syncError: string | null
  }
}

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
  data: Partial<PatientDataRecord> | any
  createdAt: string
  retryCount: number
  maxRetries: number
  backoffMs: number
  status: 'pending' | 'syncing' | 'failed' | 'synced'
  lastError?: string
  // Backward compat fields for old sync hook
  formId?: string
  formType?: string
}

const DB_NAME = 'Kollectcare_RWE'
const DB_VERSION = 4
const PATIENT_DATA_STORE = 'patientData'
const SYNC_QUEUE_STORE = 'syncQueue'
const METADATA_STORE = 'metadata'

class IndexedDBService {
  private db: IDBDatabase | null = null
  private isInitialized = false

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
            console.log('✓ IndexedDB initialized (v4 patient-centric)')
          }
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result

          // UNIFIED PATIENT DATA STORE - ONE RECORD PER PATIENT
          if (!db.objectStoreNames.contains(PATIENT_DATA_STORE)) {
            const store = db.createObjectStore(PATIENT_DATA_STORE, { keyPath: 'patientId' })
            store.createIndex('doctorId', 'doctorId', { unique: false })
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('✓ Created patient data store')
            }
          }

          // SYNC QUEUE
          if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' })
            syncStore.createIndex('status', 'status', { unique: false })
            syncStore.createIndex('patientId', 'patientId', { unique: false })
          }

          // METADATA
          if (!db.objectStoreNames.contains(METADATA_STORE)) {
            db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
          }
        }
      })
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('IndexedDB error:', error)
      }
      throw error
    }
  }

  // ===== PATIENT DATA METHODS =====

  async getPatientsByDoctor(doctorId: string): Promise<PatientDataRecord[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readonly')
      const store = transaction.objectStore(PATIENT_DATA_STORE)
      const index = store.index('doctorId')
      const request = index.getAll(doctorId)

      request.onsuccess = () => {
        const patients = request.result as PatientDataRecord[]
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.log(`✓ Loaded ${patients.length} patients for doctor`)
        }
        resolve(patients)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getPatient(patientId: string): Promise<PatientDataRecord | null> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readonly')
      const store = transaction.objectStore(PATIENT_DATA_STORE)
      const request = store.get(patientId)

      request.onsuccess = () => {
        const patient = request.result as PatientDataRecord | undefined
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && patient) {
          console.log(`✓ Loaded patient: ${patientId}`)
        }
        resolve(patient || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async savePatient(data: PatientDataRecord): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE, SYNC_QUEUE_STORE], 'readwrite')
      const patientStore = transaction.objectStore(PATIENT_DATA_STORE)
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE)

      const putReq = patientStore.put(data)
      putReq.onsuccess = () => {
        const syncItem: SyncQueueItem = {
          id: `${data.patientId}-${Date.now()}`,
          patientId: data.patientId,
          dataType: 'patient',
          action: 'update',
          data,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          backoffMs: 1000,
          status: 'pending',
        }

        const syncReq = syncStore.put(syncItem)
        syncReq.onsuccess = () => {
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log(`✓ Saved patient: ${data.patientId} (followups: ${data.followups?.length || 0})`)
          }
          resolve()
        }
        syncReq.onerror = () => reject(syncReq.error)
      }
      putReq.onerror = () => reject(putReq.error)
    })
  }

  async addFollowupForm(patientId: string, followup: FollowupFormData): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE, SYNC_QUEUE_STORE], 'readwrite')
      const patientStore = transaction.objectStore(PATIENT_DATA_STORE)
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE)

      const getReq = patientStore.get(patientId)
      getReq.onsuccess = () => {
        const patient = getReq.result as PatientDataRecord
        if (!patient) {
          reject(new Error(`Patient ${patientId} not found`))
          return
        }

        if (!patient.followups) patient.followups = []
        patient.followups.push(followup)
        patient.metadata.isDirty = true

        const putReq = patientStore.put(patient)
        putReq.onsuccess = () => {
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

          const syncReq = syncStore.put(syncItem)
          syncReq.onsuccess = () => {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log(`✓ Added followup to ${patientId}`)
            }
            resolve()
          }
          syncReq.onerror = () => reject(syncReq.error)
        }
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  // ===== SYNC QUEUE METHODS =====

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readonly')
      const store = transaction.objectStore(SYNC_QUEUE_STORE)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        resolve(request.result as SyncQueueItem[])
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markSynced(syncItemId: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE)
      const getReq = store.get(syncItemId)

      getReq.onsuccess = () => {
        const item = getReq.result as SyncQueueItem
        if (item) {
          item.status = 'synced'
          const putReq = store.put(item)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  // ===== BACKWARD COMPATIBILITY - FOR OLD SYNC HOOK AND FORMS =====

  async loadForm(formId: string): Promise<any> {
    // Old sync hook compatibility
    return null
  }

  async saveForm(formId: string, formType: string, patientId: string, data: any, isDraft: boolean, errors: string[]): Promise<void> {
    // Legacy compatibility - data is now in patient records
  }

  async savePatientIndex(patient: any): Promise<void> {
    // Legacy compatibility - use savePatient instead
    if (patient && patient.id) {
      const patientData: PatientDataRecord = {
        patientId: patient.id,
        doctorId: patient.doctorId || '',
        patientInfo: {
          id: patient.id,
          patientCode: patient.patientCode || '',
          firstName: patient.firstName || '',
          lastName: patient.lastName || '',
          email: patient.email || '',
          dob: patient.dob || '',
          age: patient.age || 0,
          gender: patient.gender || '',
          durationOfDiabetes: patient.durationOfDiabetes || 0,
          createdAt: patient.createdAt || new Date().toISOString(),
          updatedAt: patient.updatedAt || new Date().toISOString(),
        },
        baseline: null,
        followups: [],
        metadata: {
          lastSynced: null,
          isDirty: false,
          syncError: null,
        },
      }
      await this.savePatient(patientData)
    }
  }

  async loadPatientDrafts(patientId: string): Promise<any[]> {
    // Load patient data with draft forms
    const patient = await this.getPatient(patientId)
    if (!patient) return []
    
    const drafts = []
    if (patient.baseline?.status === 'draft') {
      drafts.push(patient.baseline)
    }
    patient.followups?.forEach(followup => {
      if (followup.status === 'draft') {
        drafts.push(followup)
      }
    })
    return drafts
  }

  async clearDraft(formId: string): Promise<void> {
    // Clear draft form (set status to draft and clear data)
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    return this.getSyncQueue()
  }

  async getStats(): Promise<any> {
    if (!this.db) await this.initialize()
    
    return {
      patients: 0,
      pendingSync: await this.getSyncQueue(),
      lastSync: null,
    }
  }

  async markAsSynced(syncItemId: string): Promise<void> {
    await this.markSynced(syncItemId)
  }

  async recordSyncFailure(syncItemId: string, error: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = transaction.objectStore(SYNC_QUEUE_STORE)
      const getReq = store.get(syncItemId)

      getReq.onsuccess = () => {
        const item = getReq.result as SyncQueueItem
        if (item) {
          item.status = 'failed'
          item.lastError = error
          const putReq = store.put(item)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  // ===== LOGOUT =====

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const storeNames = [PATIENT_DATA_STORE, SYNC_QUEUE_STORE, METADATA_STORE]
      const transaction = this.db!.transaction(storeNames, 'readwrite')

      for (const storeName of storeNames) {
        try {
          const store = transaction.objectStore(storeName)
          store.clear()
        } catch (error) {
          console.error(`Error accessing ${storeName}:`, error)
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

// Type exports
export type { PatientDataRecord, BaselineFormData, FollowupFormData, SyncQueueItem }
export interface StoredFormData {
  id: string
  type: 'baseline' | 'followup'
  patientId: string
  isDraft: boolean
  data: any
  validationErrors: string[]
  savedAt: string
  syncedToFirebaseAt: string | null
  syncAttempts: number
  lastSyncError: string | null
}
