/**
 * Conflict Detection & Resolution
 * 
 * Handles scenarios:
 * - Same patient edited offline and online
 * - Race conditions during sync
 * - Data version mismatches
 * - Stale updates
 */

'use client'

export interface DataChecksum {
  version: number
  checksum: string
  timestamp: number
  deviceId: string
}

export interface ConflictInfo {
  hasConflict: boolean
  type: 'no-conflict' | 'version-mismatch' | 'checksum-mismatch' | 'newer-server-version'
  localVersion: number
  serverVersion: number
  localChecksum: string
  serverChecksum: string
  resolution: 'use-local' | 'use-server' | 'merge-needed'
}

/**
 * Generate checksum for data
 * Detects if data was modified
 */
export function generateChecksum(data: any): string {
  const jsonString = JSON.stringify(data)
  
  // Simple checksum using character codes
  let hash = 0
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16)
}

/**
 * Store data version with checksum
 */
export async function storeDataVersion(
  tableName: string,
  id: string,
  data: any,
  version: number
): Promise<void> {
  const checksum = generateChecksum(data)
  const deviceId = typeof window !== 'undefined' 
    ? (localStorage.getItem('clinical_trial_device_id') || 'unknown')
    : 'server'
  
  const versionInfo: DataChecksum = {
    version,
    checksum,
    timestamp: Date.now(),
    deviceId
  }
  
  // Store in meta table
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('clinical-trial-db')
    
    request.onsuccess = () => {
      const db = request.result
      
      // Ensure meta store exists
      if (!db.objectStoreNames.contains('_versions')) {
        const newVersion = db.version + 1
        const newRequest = indexedDB.open('clinical-trial-db', newVersion)
        newRequest.onupgradeneeded = (event) => {
          const dbUpgrade = (event.target as IDBOpenDBRequest).result
          if (!dbUpgrade.objectStoreNames.contains('_versions')) {
            dbUpgrade.createObjectStore('_versions', { keyPath: 'id' })
          }
        }
        newRequest.onsuccess = () => {
          storeVersionInfo(newRequest.result, tableName, id, versionInfo, resolve, reject)
        }
        newRequest.onerror = () => reject(newRequest.error)
      } else {
        storeVersionInfo(db, tableName, id, versionInfo, resolve, reject)
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

function storeVersionInfo(
  db: IDBDatabase,
  tableName: string,
  id: string,
  versionInfo: DataChecksum,
  resolve: () => void,
  reject: (error: any) => void
): void {
  const tx = db.transaction('_versions', 'readwrite')
  const store = tx.objectStore('_versions')
  const versionKey = `${tableName}_${id}`
  
  const request = store.put({
    id: versionKey,
    ...versionInfo
  })
  
  request.onerror = () => reject(request.error)
  request.onsuccess = () => resolve()
}

/**
 * Check for conflicts between local and server data
 */
export async function detectConflict(
  localData: any,
  serverData: any,
  localVersion: number,
  serverVersion: number
): Promise<ConflictInfo> {
  const localChecksum = generateChecksum(localData)
  const serverChecksum = generateChecksum(serverData)
  
  // No conflict if versions match and checksums match
  if (localVersion === serverVersion && localChecksum === serverChecksum) {
    return {
      hasConflict: false,
      type: 'no-conflict',
      localVersion,
      serverVersion,
      localChecksum,
      serverChecksum,
      resolution: 'use-server'
    }
  }
  
  // Server has newer version
  if (serverVersion > localVersion) {
    return {
      hasConflict: true,
      type: 'newer-server-version',
      localVersion,
      serverVersion,
      localChecksum,
      serverChecksum,
      resolution: 'use-server' // Server wins (more recent)
    }
  }
  
  // Version match but data differs
  if (localVersion === serverVersion && localChecksum !== serverChecksum) {
    return {
      hasConflict: true,
      type: 'checksum-mismatch',
      localVersion,
      serverVersion,
      localChecksum,
      serverChecksum,
      resolution: 'merge-needed' // Need manual resolution
    }
  }
  
  // Local is newer - use local
  return {
    hasConflict: true,
    type: 'version-mismatch',
    localVersion,
    serverVersion,
    localChecksum,
    serverChecksum,
    resolution: 'use-local' // Local is newer
  }
}

/**
 * Get stored version info
 */
export async function getStoredVersion(
  tableName: string,
  id: string
): Promise<DataChecksum | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('clinical-trial-db')
      
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('_versions')) {
          resolve(null)
          return
        }
        
        const tx = db.transaction('_versions', 'readonly')
        const store = tx.objectStore('_versions')
        const versionKey = `${tableName}_${id}`
        const getRequest = store.get(versionKey)
        
        getRequest.onsuccess = () => {
          const result = getRequest.result
          if (result) {
            const { version, checksum, timestamp, deviceId } = result
            resolve({ version, checksum, timestamp, deviceId })
          } else {
            resolve(null)
          }
        }
        
        getRequest.onerror = () => resolve(null)
      }
      
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Resolve conflict based on strategy
 */
export function resolveConflict(
  localData: any,
  serverData: any,
  conflict: ConflictInfo
): any {
  switch (conflict.resolution) {
    case 'use-server':
      return serverData
    
    case 'use-local':
      return localData
    
    case 'merge-needed':
      // Simple merge: server data wins for fields that were updated on server
      return {
        ...serverData,
        ...localData, // Local overwrites server
        _conflict: true,
        _conflictResolution: 'local-priority'
      }
  }
}

/**
 * Is stale update check
 * Prevents writing stale data
 */
export async function isStaleUpdate(
  tableName: string,
  id: string,
  newVersion: number
): Promise<boolean> {
  const stored = await getStoredVersion(tableName, id)
  if (!stored) return false
  
  return newVersion < stored.version
}
