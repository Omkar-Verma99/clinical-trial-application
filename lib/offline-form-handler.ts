/**
 * Offline Forms Handler
 * 
 * Handles form submission when offline:
 * - Stores forms in IndexedDB
 * - Queues for sync
 * - Auto-syncs when online
 */

'use client'

import { offlineQueue } from './offline-queue'

export interface OfflineFormSubmission {
  id: string
  patientId: string // Real or temp ID
  formType: 'baseline' | 'followup'
  formData: any
  visitNumber?: number
  visitDate?: string
  createdAt: number
  updatedAt: number
  synced: boolean
  syncError?: string
}

class OfflineFormHandler {
  private static readonly DB_NAME = 'clinical-trial-db'
  private static readonly FORMS_STORE = 'offline_forms'
  private db: IDBDatabase | null = null

  constructor() {
    this.initDB()
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve()
        return
      }

      const request = indexedDB.open(OfflineFormHandler.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(OfflineFormHandler.FORMS_STORE)) {
          const store = db.createObjectStore(OfflineFormHandler.FORMS_STORE, {
            keyPath: 'id'
          })
          store.createIndex('patientId', 'patientId', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
          store.createIndex('formType', 'formType', { unique: false })
        }
      }
    })
  }

  /**
   * Save form offline
   */
  async saveFormOffline(
    patientId: string,
    formType: 'baseline' | 'followup',
    formData: any,
    visitNumber?: number,
    visitDate?: string
  ): Promise<string> {
    await this.ensureDB()

    const id = this.generateFormId()
    const now = Date.now()
    const submission: OfflineFormSubmission = {
      id,
      patientId,
      formType,
      formData,
      visitNumber,
      visitDate,
      createdAt: now,
      updatedAt: now,
      synced: false
    }

    // Save to forms store
    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readwrite')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.add(submission)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })

    // Add to sync queue
    await offlineQueue.addToQueue('form_submit', patientId, submission)

    return id
  }

  /**
   * Update form data
   */
  async updateFormOffline(
    formId: string,
    formData: any
  ): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readwrite')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.get(formId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const form = request.result as OfflineFormSubmission
        if (form) {
          form.formData = formData
          form.updatedAt = Date.now()
          form.synced = false

          const updateRequest = store.put(form)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
    })
  }

  /**
   * Get form by ID
   */
  async getFormOffline(formId: string): Promise<OfflineFormSubmission | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readonly')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.get(formId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Get all forms for a patient
   */
  async getPatientFormsOffline(patientId: string): Promise<OfflineFormSubmission[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readonly')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const index = store.index('patientId')
      const request = index.getAll(patientId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve((request.result as OfflineFormSubmission[]).sort((a, b) => b.createdAt - a.createdAt))
      }
    })
  }

  /**
   * Get pending forms (not synced)
   */
  async getPendingFormsOffline(): Promise<OfflineFormSubmission[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readonly')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const forms = (request.result as OfflineFormSubmission[]).filter(f => !f.synced)
        resolve(forms)
      }
    })
  }

  /**
   * Mark form as synced
   */
  async markFormAsSynced(
    formId: string,
    realPatientId?: string
  ): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readwrite')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.get(formId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const form = request.result as OfflineFormSubmission
        if (form) {
          form.synced = true
          if (realPatientId) form.patientId = realPatientId
          form.updatedAt = Date.now()

          const updateRequest = store.put(form)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
    })
  }

  /**
   * Delete form (after sync)
   */
  async deleteFormOffline(formId: string): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(OfflineFormHandler.FORMS_STORE, 'readwrite')
      const store = tx.objectStore(OfflineFormHandler.FORMS_STORE)
      const request = store.delete(formId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) await this.initDB()
  }

  private generateFormId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const offlineFormHandler = new OfflineFormHandler()
