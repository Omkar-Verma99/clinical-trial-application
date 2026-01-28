/**
 * Sentry Server Configuration
 * Handles error tracking, performance monitoring, and logging on the server side
 */

import * as Sentry from '@sentry/nextjs'

export function initSentryServer() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Version
    release: process.env.APP_VERSION || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Disable logging in production (prevent console spam and bandwidth waste)
    enableLogs: false,
    
    // Debug disabled (always silent in production)
    debug: false,
    
    // Server-specific integrations
    integrations: [
      // Send console.log, console.warn, console.error to Sentry
      Sentry.consoleLoggingIntegration({
        levels: ['error', 'warn'],
      }),
      // HTTP client integration for tracking API calls
      Sentry.httpClientIntegration(),
      // Node.js specific integrations
      Sentry.anrIntegration(),
      Sentry.contextLinesIntegration(),
      Sentry.localVariablesIntegration(),
    ],
    
    // Ignore certain errors that are not useful
    ignoreErrors: [
      'Network request failed',
      'Request failed',
    ],
    
    // Before send hook for filtering sensitive data
    beforeSend(event, hint) {
      // Filter sensitive request/response data
      if (event.request) {
        if (typeof event.request.cookies === 'object') {
          event.request.cookies = {}
        }
        if (event.request.headers) {
          event.request.headers.authorization = '[REDACTED]'
          event.request.headers['x-api-key'] = '[REDACTED]'
        }
      }

      // Filter request body for sensitive data
      if (event.request?.data) {
        event.request.data = {
          ...event.request.data,
          password: '[REDACTED]',
          token: '[REDACTED]',
          apiKey: '[REDACTED]',
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        const { logger } = Sentry
        logger.info('Sentry Server Event captured', {
          eventId: event.event_id,
          level: event.level,
        })
      }
      
      return event
    },
  })

  // Get Sentry logger for structured logging
  const { logger } = Sentry
  
  return { logger, Sentry }
}

/**
 * Capture Firebase-related errors with context
 */
export function captureFirebaseError(
  error: Error,
  context: {
    operation?: string
    collectionName?: string
    tags?: Record<string, string>
  } = {}
) {
  const { logger } = Sentry

  logger.error('Firebase operation failed', {
    operation: context.operation,
    collectionName: context.collectionName,
    errorMessage: error.message,
    ...context.tags,
  })

  Sentry.captureException(error, {
    tags: {
      service: 'firebase',
      operation: context.operation || 'unknown',
      collectionName: context.collectionName,
      ...context.tags,
    },
    level: 'error',
  })
}

/**
 * Capture API errors with detailed context
 */
export function captureApiError(
  error: Error,
  context: {
    endpoint?: string
    method?: string
    statusCode?: number
    tags?: Record<string, string>
  } = {}
) {
  const { logger } = Sentry

  logger.error(logger.fmt`API request failed to ${context.method || 'REQUEST'} ${context.endpoint || '/'}`, {
    endpoint: context.endpoint,
    method: context.method,
    statusCode: context.statusCode,
    errorMessage: error.message,
    ...context.tags,
  })

  Sentry.captureException(error, {
    tags: {
      service: 'api',
      endpoint: context.endpoint || 'unknown',
      method: context.method || 'unknown',
      statusCode: context.statusCode?.toString(),
      ...context.tags,
    },
    level: 'error',
  })
}

/**
 * Log database operations
 */
export function logDatabaseOperation(
  operation: 'query' | 'insert' | 'update' | 'delete',
  table: string,
  duration?: number
) {
  const { logger } = Sentry

  logger.info(logger.fmt`Database ${operation} on table ${table} completed`, {
    operation,
    table,
    duration_ms: duration,
  })
}
