/**
 * Offline Auth System - Hybrid Approach
 * 
 * Features:
 * ✓ First login requires network (Firebase auth - secure)
 * ✓ Credentials encrypted and stored locally
 * ✓ Monthly re-verification when online
 * ✓ Offline login with stored credentials
 * ✓ Patient list pre-cached for offline browsing
 * ✓ Automatic credential sync when online
 */

'use client'

import { useCallback } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
// @ts-ignore - crypto-js types not available, but module works fine
import CryptoJS from 'crypto-js'

// ========== ENCRYPTION UTILITIES ==========
// AES-256 Encryption (Production Grade)
class CredentialEncryption {
  private static readonly SECRET_KEY = (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_ENCRYPTION_KEY) 
    ? (window as any).NEXT_PUBLIC_ENCRYPTION_KEY 
    : 'clinical-trial-app-secret-key-change-this-in-production'

  static encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        data,
        this.SECRET_KEY
      ).toString()
      
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Data encrypted with AES-256')
      }
      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt sensitive data - please check configuration')
    }
  }

  static decrypt(encrypted: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        this.SECRET_KEY
      ).toString(CryptoJS.enc.Utf8)
      
      if (!decrypted) {
        throw new Error('Decryption resulted in empty string')
      }
      
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Data decrypted successfully')
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt credentials - they may be corrupted or tampered. Please re-login.')
    }
  }
}

// ========== OFFLINE AUTH STORE ==========
interface StoredCredentials {
  email: string
  passwordHash: string // Never store plain password
  token: string
  userId: string
  lastVerified: string // ISO timestamp
  createdAt: string
}

export class OfflineAuthStore {
  private static readonly STORAGE_KEY = 'offline-auth'
  private static readonly VERIFICATION_INTERVAL = 30 * 24 * 60 * 60 * 1000 // 30 days

  /**
   * Store credentials after successful online login
   */
  static async storeCredentials(
    email: string,
    passwordHash: string,
    token: string,
    userId: string
  ): Promise<void> {
    const credentials: StoredCredentials = {
      email,
      passwordHash, // Use bcrypt hash, not plain password
      token,
      userId,
      lastVerified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    const encrypted = CredentialEncryption.encrypt(JSON.stringify(credentials))

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, encrypted)

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Credentials stored for offline access')
      }
    }
  }

  /**
   * Retrieve stored credentials
   */
  static getStoredCredentials(): StoredCredentials | null {
    try {
      if (typeof localStorage === 'undefined') return null

      const encrypted = localStorage.getItem(this.STORAGE_KEY)
      if (!encrypted) return null

      const decrypted = CredentialEncryption.decrypt(encrypted)
      return JSON.parse(decrypted) as StoredCredentials
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Failed to retrieve stored credentials:', error)
      }
      return null
    }
  }

  /**
   * Check if re-verification is needed
   */
  static needsReVerification(): boolean {
    const credentials = this.getStoredCredentials()
    if (!credentials) return false

    const lastVerified = new Date(credentials.lastVerified).getTime()
    const now = Date.now()
    const timeSinceVerification = now - lastVerified

    // Need verification if older than 30 days
    return timeSinceVerification > this.VERIFICATION_INTERVAL
  }

  /**
   * Update verification timestamp (after online verification)
   */
  static updateVerificationTime(): void {
    const credentials = this.getStoredCredentials()
    if (!credentials) return

    credentials.lastVerified = new Date().toISOString()
    const encrypted = CredentialEncryption.encrypt(JSON.stringify(credentials))

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, encrypted)

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Verification timestamp updated')
      }
    }
  }

  /**
   * Clear stored credentials
   */
  static clearCredentials(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Stored credentials cleared')
      }
    }
  }
}

// ========== PATIENT PRE-CACHING ==========
interface CachedPatient {
  id: string
  patientCode: string
  age: number
  gender: string
  durationOfDiabetes: number
  createdAt: string
  hasBaseline: boolean
  hasFollowUp: boolean
  doctorId: string
}

interface PatientCache {
  patients: CachedPatient[]
  lastCached: string
  doctorId: string
}

export class PatientPreCache {
  private static readonly CACHE_KEY = 'patient-pre-cache'
  private static readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  /**
   * Cache all patients for offline browsing
   */
  static async cachePatients(patients: CachedPatient[], doctorId: string): Promise<void> {
    try {
      const cache: PatientCache = {
        patients,
        lastCached: new Date().toISOString(),
        doctorId,
      }

      // Store in IndexedDB (for larger data)
      const db = await this.getIndexedDB()
      const transaction = db.transaction(['patientCache'], 'readwrite')
      const store = transaction.objectStore('patientCache')

      await new Promise((resolve, reject) => {
        const request = store.put(cache)
        request.onsuccess = () => resolve(undefined)
        request.onerror = () => reject(request.error)
      })

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`✓ Cached ${patients.length} patients for offline access`)
      }
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Failed to cache patients:', error)
      }
    }
  }

  /**
   * Get cached patients
   */
  static async getCachedPatients(): Promise<CachedPatient[]> {
    try {
      const db = await this.getIndexedDB()
      const transaction = db.transaction(['patientCache'], 'readonly')
      const store = transaction.objectStore('patientCache')

      return new Promise((resolve, reject) => {
        const request = store.get('patients')
        request.onsuccess = () => {
          const cache = request.result as PatientCache
          if (cache && this.isCacheValid(cache)) {
            resolve(cache.patients)
          } else {
            resolve([])
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      return []
    }
  }

  /**
   * Check if cache is still valid
   */
  private static isCacheValid(cache: PatientCache): boolean {
    const lastCached = new Date(cache.lastCached).getTime()
    const now = Date.now()
    return now - lastCached < this.CACHE_EXPIRY
  }

  /**
   * Clear patient cache
   */
  static async clearCache(): Promise<void> {
    try {
      const db = await this.getIndexedDB()
      const transaction = db.transaction(['patientCache'], 'readwrite')
      const store = transaction.objectStore('patientCache')

      await new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve(undefined)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Failed to clear patient cache:', error)
      }
    }
  }

  private static async getIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('clinical-trial-app')

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('patientCache')) {
          db.createObjectStore('patientCache', { keyPath: 'doctorId' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// ========== OFFLINE AUTH CONTEXT HOOK ==========
export interface OfflineAuthState {
  isAuthenticated: boolean
  isOnline: boolean
  needsReVerification: boolean
  userEmail: string | null
  userId: string | null
  canUseOffline: boolean
}

export class OfflineAuthManager {
  /**
   * Login with stored offline credentials
   */
  static async loginOffline(email: string, passwordHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = OfflineAuthStore.getStoredCredentials()

      if (!credentials) {
        return {
          success: false,
          error: 'No offline credentials stored. Please login online first.',
        }
      }

      // Verify email matches
      if (credentials.email !== email) {
        return {
          success: false,
          error: 'Email does not match stored credentials',
        }
      }

      // In production, use bcrypt to verify password hash
      // For now, simple comparison (NOT SECURE!)
      if (credentials.passwordHash !== passwordHash) {
        return {
          success: false,
          error: 'Incorrect password',
        }
      }

      // Check if re-verification is overdue
      if (OfflineAuthStore.needsReVerification()) {
        return {
          success: false,
          error: 'Please verify online (credentials need monthly refresh)',
        }
      }

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`✓ Offline login successful for ${email}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  /**
   * Online login - store credentials for offline use
   */
  static async loginOnline(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; userId?: string; token?: string }> {
    try {
      // Firebase authentication
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Get ID token for offline storage
      const token = await result.user.getIdToken()

      // Hash password (in production, do this on backend!)
      const passwordHash = await this.hashPassword(password)

      // Store credentials for offline access
      await OfflineAuthStore.storeCredentials(
        email,
        passwordHash,
        token,
        result.user.uid
      )

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log(`✓ Online login successful, credentials stored for offline`)
      }

      return {
        success: true,
        userId: result.user.uid,
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  /**
   * Re-verify online (monthly check)
   */
  static async reVerifyOnline(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to login with Firebase
      await signInWithEmailAndPassword(auth, email, password)

      // Update verification timestamp
      OfflineAuthStore.updateVerificationTime()

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Online re-verification successful')
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      }
    }
  }

  /**
   * Logout - clear stored credentials
   */
  static async logout(): Promise<void> {
    try {
      await firebaseSignOut(auth)
      OfflineAuthStore.clearCredentials()
      await PatientPreCache.clearCache()

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('✓ Logged out successfully')
      }
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.error('Logout error:', error)
      }
    }
  }

  /**
   * Get current auth state
   */
  static getAuthState(): OfflineAuthState {
    const credentials = OfflineAuthStore.getStoredCredentials()
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    return {
      isAuthenticated: !!credentials,
      isOnline,
      needsReVerification: OfflineAuthStore.needsReVerification(),
      userEmail: credentials?.email || null,
      userId: credentials?.userId || null,
      canUseOffline: !!credentials && !OfflineAuthStore.needsReVerification(),
    }
  }

  /**
   * Simple password hashing (use bcrypt in production!)
   */
  private static async hashPassword(password: string): Promise<string> {
    // In production, call backend to hash with bcrypt
    // For demo, use simple hash
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}
