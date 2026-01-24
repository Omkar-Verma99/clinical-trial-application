/**
 * Network Connectivity Detection Utility
 * Detects online/offline status and handles connectivity issues
 */

type ConnectionListener = (isOnline: boolean) => void

class NetworkDetector {
  private isOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true
  private listeners: Set<ConnectionListener> = new Set()
  private initialized: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    if (typeof window === 'undefined' || this.initialized) return

    this.initialized = true

    const handleOnline = () => {
      this.isOnline = true
      this.notifyListeners()
    }

    const handleOffline = () => {
      this.isOnline = false
      this.notifyListeners()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  /**
   * Check if device is currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Subscribe to connection status changes
   * @param listener - Callback function for connection changes
   * @returns Unsubscribe function
   */
  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener)
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        console.error('Error notifying connection listener:', error)
      }
    })
  }
}

// Export singleton instance
export const networkDetector = new NetworkDetector()

/**
 * Hook to detect online/offline status
 * Usage in React components:
 * const isOnline = useNetworkStatus()
 */
import { useState, useEffect } from 'react'

export const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const unsubscribe = networkDetector.subscribe(setIsOnline)
    return unsubscribe
  }, [])

  return isOnline
}

/**
 * Check if a network operation is possible
 * Shows user-friendly message if offline
 * @param message - Optional custom message
 * @returns Boolean indicating if operation can proceed
 */
export const checkNetworkAvailable = (message: string = 'You appear to be offline'): boolean => {
  if (!networkDetector.getOnlineStatus()) {
    // Try to import toast if available
    try {
      const toastModule = require('@/hooks/use-toast')
      if (toastModule?.useToast) {
        // Can't use hook here, just log warning
        console.warn(message)
      }
    } catch {
      console.warn(message)
    }
    return false
  }
  return true
}
