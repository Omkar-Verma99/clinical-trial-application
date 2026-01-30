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

  async loadForm(formId: string, patientId?: string): Promise<StoredFormData | null> {
    // Load form data from patient record using formId
    if (!this.db) await this.initialize()

    // If patientId not provided, we need to search through all patients
    // For now, assume it's passed by the caller
    if (!patientId) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.warn('loadForm: patientId not provided, cannot retrieve form')
      }
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readonly')
      const store = transaction.objectStore(PATIENT_DATA_STORE)
      const request = store.get(patientId)

      request.onsuccess = () => {
        const patient = request.result as PatientDataRecord | undefined
        if (!patient) {
          resolve(null)
          return
        }

        // Search for form by ID
        let foundForm: any = null
        
        // Check baseline
        if (patient.baseline?.formId === formId) {
          foundForm = patient.baseline
        }
        
        // Check followups
        if (!foundForm && patient.followups) {
          const followup = patient.followups.find(f => f.formId === formId)
          if (followup) foundForm = followup
        }

        if (foundForm) {
          resolve({
            formId,
            formType: foundForm.formType || (patient.baseline?.formId === formId ? 'baseline' : 'followup'),
            data: foundForm,
            isDraft: foundForm.status === 'draft',
            savedAt: foundForm.updatedAt,
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveForm(formId: string, formType: string, patientId: string, data: any, isDraft: boolean, errors: string[]): Promise<void> {
    // V4 SCHEMA: Save form data as part of unified patient record
    if (!this.db) await this.initialize()

    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db!.transaction([PATIENT_DATA_STORE, SYNC_QUEUE_STORE], 'readwrite')
        const patientStore = transaction.objectStore(PATIENT_DATA_STORE)
        const syncStore = transaction.objectStore(SYNC_QUEUE_STORE)

        // SPECIAL CASE: Creating a new patient
        if (formType === 'patient') {
          const newPatient: PatientDataRecord = {
            id: patientId,
            ...data,
            baseline: null,
            followups: [],
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isDirty: !isDraft,
              syncError: errors.length > 0 ? errors.join('; ') : null,
            }
          }

          const putReq = patientStore.put(newPatient)
          putReq.onsuccess = () => {
            // Queue for sync if not draft
            if (!isDraft) {
              const syncItem: SyncQueueItem = {
                id: `${patientId}-${Date.now()}`,
                patientId,
                dataType: 'patient',
                action: 'create',
                data,
                formId: patientId,
                formType: 'patient',
                createdAt: new Date().toISOString(),
                retryCount: 0,
                maxRetries: 5,
                backoffMs: 1000,
              }
              const syncReq = syncStore.add(syncItem)
              syncReq.onsuccess = () => resolve()
              syncReq.onerror = () => reject(syncReq.error)
            } else {
              resolve()
            }
          }
          putReq.onerror = () => reject(putReq.error)
          return
        }

        // NORMAL CASE: Saving baseline/followup form for existing patient
        const getReq = patientStore.get(patientId)
        getReq.onsuccess = () => {
          const patient = getReq.result as PatientDataRecord | undefined
          if (!patient) {
            reject(new Error(`Patient ${patientId} not found in IndexedDB`))
            return
          }

          // Add or update form data based on type
          if (formType === 'baseline') {
            patient.baseline = {
              formId,
              status: isDraft ? 'draft' : 'submitted',
              ...data,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncedToFirebaseAt: null,
            }
          } else if (formType === 'followup') {
            if (!patient.followups) patient.followups = []
            
            // Check if followup with same visitNumber or formId exists
            const existingIndex = patient.followups.findIndex(
              f => f.formId === formId || (data.visitNumber && f.visitNumber === data.visitNumber)
            )
            
            const followupData: FollowupFormData = {
              formId,
              visitNumber: data.visitNumber || 1,
              visitDate: data.visitDate,
              status: isDraft ? 'draft' : 'submitted',
              ...data,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncedToFirebaseAt: null,
            }
            
            if (existingIndex >= 0) {
              patient.followups[existingIndex] = followupData
            } else {
              patient.followups.push(followupData)
            }
          }

          patient.metadata.isDirty = !isDraft
          patient.metadata.syncError = errors.length > 0 ? errors.join('; ') : null

          // Save patient record
          const putReq = patientStore.put(patient)
          putReq.onsuccess = () => {
            // Add to sync queue if not a draft
            if (!isDraft) {
              const syncItem: SyncQueueItem = {
                id: `${formId}-${Date.now()}`,
                patientId,
                dataType: formType as 'patient' | 'baseline' | 'followup',
                action: 'update',
                data,
                formId,
                formType,
                createdAt: new Date().toISOString(),
                retryCount: 0,
                maxRetries: 5,
                backoffMs: 1000,
                status: 'pending',
              }
              const syncReq = syncStore.put(syncItem)
              syncReq.onsuccess = () => {
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                  console.log(`✓ Saved ${formType} form to IndexedDB: ${formId}`)
                }
                resolve()
              }
              syncReq.onerror = () => reject(syncReq.error)
            } else {
              if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                console.log(`✓ Saved ${formType} draft to IndexedDB: ${formId}`)
              }
              resolve()
            }
          }
          putReq.onerror = () => reject(putReq.error)
        }
        getReq.onerror = () => reject(getReq.error)
      } catch (error) {
        reject(error)
      }
    })
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
    if (patient.followups && Array.isArray(patient.followups)) {
      patient.followups.forEach(followup => {
        if (followup && followup.status === 'draft') {
          drafts.push(followup)
        }
      })
    }
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

  /**
   * Migrate patient from temporary ID to real Firestore ID
   * CRITICAL for new patient creation - avoids duplicate entries
   * 
   * Flow:
   * 1. Patient saved offline with temp ID: patient-uid-timestamp
   * 2. When online, Firestore assigns real ID: docRef.id
   * 3. This function renames the temp ID to real ID (single entry)
   * 4. No duplicates - just one patient record with the real ID
   */
  async migratePatientId(tempPatientId: string, realFirestoreId: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PATIENT_DATA_STORE], 'readwrite')
      const store = transaction.objectStore(PATIENT_DATA_STORE)

      // Get the patient record with the temporary ID
      const getReq = store.get(tempPatientId)
      
      getReq.onsuccess = () => {
        const patient = getReq.result as PatientDataRecord | undefined
        
        if (!patient) {
          // If temp ID doesn't exist, nothing to migrate
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.warn(`Temp patient ${tempPatientId} not found for migration`)
          }
          resolve()
          return
        }

        // Update the patient record with the real Firestore ID
        const migratedPatient: PatientDataRecord = {
          ...patient,
          patientId: realFirestoreId, // Use real ID as the primary key
          firebaseId: realFirestoreId,
          metadata: {
            ...patient.metadata,
            isSynced: true, // Mark as synced since we just saved to Firebase
            lastSyncTime: new Date().toISOString(),
          }
        }

        // Delete the old temp ID entry
        const deleteReq = store.delete(tempPatientId)
        
        deleteReq.onsuccess = () => {
          // Now add the new entry with the real Firestore ID
          const putReq = store.put(migratedPatient)
          
          putReq.onsuccess = () => {
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log(`✓ Migrated patient from temp ID to Firestore ID: ${realFirestoreId}`)
            }
            resolve()
          }
          
          putReq.onerror = () => reject(putReq.error)
        }
        
        deleteReq.onerror = () => reject(deleteReq.error)
      }
      
      getReq.onerror = () => reject(getReq.error)
    })
  }
}

export const indexedDBService = new IndexedDBService()

// Type exports
export type { PatientDataRecord, BaselineFormData, FollowupFormData, SyncQueueItem }
export interface StoredFormData {
  formId: string
  formType: 'baseline' | 'followup'
  patientId?: string
  isDraft: boolean
  data: any
  validationErrors?: string[]
  savedAt: string
  syncedToFirebaseAt?: string | null
  syncAttempts?: number
  lastSyncError?: string | null
}
