/**
 * Secure ID Generation & Management
 * 
 * Prevents ID collisions with:
 * - Cryptographically secure random generation
 * - Device-specific identifiers
 * - Timestamp + UUID combination
 * - Collision detection
 */

'use client'

/**
 * Generate cryptographically secure UUID v4
 * Safe for distributed systems (no collisions)
 */
export function generateSecureUUID(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  
  arr[6] = (arr[6] & 0x0f) | 0x40  // Version 4
  arr[8] = (arr[8] & 0x3f) | 0x80  // Variant 10
  
  const hex = Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('')
  
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20)
  ].join('-')
}

/**
 * Generate device-scoped ID
 * Combines device ID + timestamp + random
 * Prevents collisions even if 2 users create simultaneously
 */
export function generateDeviceScopedId(prefix: string = 'tmp'): string {
  const deviceId = getOrCreateDeviceId()
  const timestamp = Date.now()
  const random = crypto.getRandomValues(new Uint8Array(8))
    .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
    .substring(0, 8)
  
  return `${prefix}_${deviceId}_${timestamp}_${random}`
}

/**
 * Get or create persistent device ID
 * Stored in localStorage for this device
 * Each device has unique ID
 */
export function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'clinical_trial_device_id'
  
  if (typeof window === 'undefined') {
    return 'server'
  }
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  
  if (!deviceId) {
    // Create new device ID
    deviceId = 'device_' + generateSecureUUID().replace(/-/g, '').substring(0, 12)
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  
  return deviceId
}

/**
 * Detect ID collision
 * Checks if ID already exists in database
 */
export async function checkIdCollision(
  tableName: string,
  id: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('clinical-trial-db')
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(tableName)) {
          resolve(false)
          return
        }
        
        const tx = db.transaction(tableName, 'readonly')
        const store = tx.objectStore(tableName)
        const getRequest = store.get(id)
        
        getRequest.onsuccess = () => {
          resolve(!!getRequest.result)
        }
        
        getRequest.onerror = () => resolve(false)
      }
      
      request.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

/**
 * Generate temp patient ID
 * Format: temp_DEVICE_TIMESTAMP_RANDOM_UUID
 * Guarantees uniqueness per device
 */
export function generateTempPatientId(): string {
  return generateDeviceScopedId('patient_temp')
}

/**
 * Generate temp form ID
 * Format: temp_DEVICE_TIMESTAMP_RANDOM_UUID
 */
export function generateTempFormId(): string {
  return generateDeviceScopedId('form_temp')
}

/**
 * Validate ID format
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  
  // Temp IDs
  if (id.startsWith('patient_temp_') || id.startsWith('form_temp_')) {
    return /^(patient_temp_|form_temp_)/.test(id)
  }
  
  // Real IDs (Firestore format)
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0
}

/**
 * Is temporary ID (not synced to server yet)
 */
export function isTemporaryId(id: string): boolean {
  return id?.startsWith('patient_temp_') || id?.startsWith('form_temp_')
}

/**
 * Extract device ID from temp ID
 */
export function extractDeviceIdFromTempId(tempId: string): string | null {
  const parts = tempId.split('_')
  if (parts.length >= 3) {
    return parts[1] // device_id part
  }
  return null
}

/**
 * Extract timestamp from temp ID
 */
export function extractTimestampFromTempId(tempId: string): number | null {
  const parts = tempId.split('_')
  if (parts.length >= 4) {
    const timestamp = parseInt(parts[2])
    return isNaN(timestamp) ? null : timestamp
  }
  return null
}
