/**
 * Hook for monitoring offline sync status
 * 
 * Usage in components:
 * const { status, itemsSynced, itemsFailed } = useSyncStatus()
 */

'use client'

import { useState, useEffect } from 'react'
import type { SyncStatus } from '@/lib/advanced-sync-engine'
import { advancedSyncEngine } from '@/lib/advanced-sync-engine'
import { networkDetector } from '@/lib/network'

export interface UseSyncStatusResult {
  status: SyncStatus['status']
  message: string
  progress?: number
  total?: number
  isOnline: boolean
  isSyncing: boolean
}

export function useSyncStatus(): UseSyncStatusResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: 'Ready'
  })
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribeNetwork = networkDetector.subscribe(setIsOnline)
    
    // Subscribe to sync status
    const unsubscribeSync = advancedSyncEngine.subscribeSyncStatus((status) => {
      setSyncStatus(status)
      setIsSyncing(status.status === 'syncing')
    })

    return () => {
      unsubscribeNetwork()
      unsubscribeSync()
    }
  }, [])

  return {
    status: syncStatus.status,
    message: syncStatus.message,
    progress: syncStatus.progress,
    total: syncStatus.total,
    isOnline,
    isSyncing
  }
}

/**
 * Component to display sync status
 * Optional - Sync happens automatically in background
 * 
 * Usage: <SyncStatusIndicator />
 * Shows progress, status messages, and sync errors
 */
export function SyncStatusIndicator() {
  const { status, message, isOnline } = useSyncStatus()

  if (status === 'idle') return null

  // Simple status indicator
  const statusEmoji: Record<string, string> = {
    'syncing': '⟳ Syncing...',
    'success': '✓ Synced',
    'partial': '⚠ Partial Sync',
    'error': '✕ Sync Failed'
  }

  return null // Sync happens silently in background
  // To show status, uncomment below:
  // return <div>{statusEmoji[status] || 'Ready'}</div>
}
