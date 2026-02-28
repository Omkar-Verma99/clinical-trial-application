"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export function DoctorDataErrorModal() {
  const { doctorDataError, retryDoctorDataFetch, logout, user } = useAuth()
  const [isRetrying, setIsRetrying] = useState(false)

  // Only show modal if there's an error AND user is authenticated
  if (!doctorDataError || !user) {
    return null
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await retryDoctorDataFetch()
    } finally {
      setIsRetrying(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-slate-950 rounded-lg shadow-2xl border border-red-200 dark:border-red-900">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-3 text-red-700 dark:text-red-400">
          Doctor Profile Failed to Load
        </h2>

        {/* Error Message */}
        <p className="text-center text-sm text-gray-700 dark:text-gray-300 mb-6">
          {doctorDataError}
        </p>

        {/* Description */}
        <p className="text-center text-xs text-gray-600 dark:text-gray-400 mb-6">
          Your profile information is essential to access the application. Please try again or contact support if the issue persists.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          >
            {isRetrying && <RefreshCw className="h-4 w-4 animate-spin" />}
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>

          <Button
            onClick={handleLogout}
            disabled={isRetrying}
            variant="outline"
            className="w-full"
          >
            Logout and Try Again
          </Button>
        </div>

        {/* Support Text */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Need help? Contact support at support@kollectcare.com
        </p>
      </div>
    </div>
  )
}
