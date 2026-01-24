/**
 * Error Tracking Utility
 * Centralized error logging and reporting
 * Can be extended to integrate with Sentry, LogRocket, etc.
 */

interface ErrorContext {
  userId?: string
  page?: string
  action?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  [key: string]: any
}

/**
 * Log an error with context
 * @param error - Error object or message
 * @param context - Additional context about the error
 */
export const logError = (
  error: Error | string,
  context?: ErrorContext
): void => {
  const timestamp = new Date().toISOString()
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  
  const errorLog = {
    timestamp,
    message,
    stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    severity: context?.severity || 'medium'
  }
  
  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', errorLog)
  }
  
  // Production error tracking (can be extended)
  // In production, errors are logged but not exposed to console
  // For production error tracking, integrate with:
  // - Sentry: window.Sentry?.captureException(error, { extra: context })
  // - DataDog: window.DD_RUM?.addError(error)
  // - LogRocket: window.LogRocket?.captureException(error)
}

/**
 * Log a warning message
 * @param message - Warning message
 * @param context - Additional context
 */
export const logWarning = (message: string, context?: ErrorContext): void => {
  const timestamp = new Date().toISOString()
  
  const warningLog = {
    timestamp,
    message,
    context
  }
  
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Warning]', warningLog)
    }
  }
}

/**
 * Log info message for tracking important events
 * @param message - Info message
 * @param context - Additional context
 */
export const logInfo = (message: string, context?: ErrorContext): void => {
  const timestamp = new Date().toISOString()
  
  const infoLog = {
    timestamp,
    message,
    context
  }
  
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Info]', infoLog)
    }
  }
}

/**
 * Safely execute async operation with error logging
 * @param fn - Async function to execute
 * @param context - Error context
 * @returns Result or error object
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    logError(error as Error, context)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
