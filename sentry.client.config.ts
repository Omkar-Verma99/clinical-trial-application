/**
 * Sentry Client Configuration
 * Handles error tracking, performance monitoring, and logging on the client side
 */

import * as Sentry from '@sentry/nextjs'

export function initSentryClient() {
  // Safe environment variable access for client-side
  const isDevelopment = typeof window !== 'undefined' ? window.location.hostname === 'localhost' : false
  const isProduction = !isDevelopment
  
  // Get env vars - Next.js inlines NEXT_PUBLIC_* at build time
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || ''
  const sentryEnv = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || (isDevelopment ? 'development' : 'production')
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  
  Sentry.init({
    dsn: sentryDsn,
    
    // Environment
    environment: sentryEnv,
    
    // Version
    release: appVersion,
    
    // Performance monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: isProduction ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Disable logging in production (prevent console spam and bandwidth waste)
    enableLogs: false,
    
    // Debug only in development
    debug: isDevelopment,
    
    // Integrations (minimized for production)
    integrations: [
      // Only capture errors and warnings from console (not all logs)
      Sentry.consoleLoggingIntegration({
        levels: ['error', 'warn'],
      }),
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Only track important navigation and interactions
        instrumentPageLoad: true,
        instrumentNavigation: true,
      }),
      // Session replay (error-only to save bandwidth)
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Ignore certain errors that are not useful
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Request failed',
      'User rejected XPRIVACY',
      'Non-Error promise rejection caught',
    ],
    
    // Before send hook for filtering sensitive data
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.request) {
        if (typeof event.request.cookies === 'object') {
          event.request.cookies = {}
        }
        if (event.request.headers) {
          event.request.headers.authorization = '[REDACTED]'
        }
      }

      // Filter breadcrumbs to remove sensitive data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'auth') {
            return {
              ...breadcrumb,
              data: {
                ...breadcrumb.data,
                password: '[REDACTED]',
                email: breadcrumb.data?.email ? '[REDACTED]' : undefined,
              },
            }
          }
          return breadcrumb
        })
      }
      
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('[Sentry] Event:', event, '\n[Sentry] Hint:', hint)
      }
      
      return event
    },
  })

  // Get Sentry logger for structured logging
  const { logger } = Sentry
  
  return { logger, Sentry }
}

/**
 * Capture offline auth errors specifically with context
 */
export function captureOfflineAuthError(
  error: Error,
  context: {
    action?: string
    email?: string
    mode?: 'online' | 'offline'
    tags?: Record<string, string>
  } = {}
) {
  Sentry.captureException(error, {
    tags: {
      component: 'offline-auth',
      action: context.action || 'unknown',
      mode: context.mode || 'offline',
      ...context.tags,
    },
    contexts: {
      offline_auth: {
        email: context.email ? '[REDACTED]' : undefined,
        action: context.action,
        mode: context.mode,
      },
    },
    level: 'error',
  })
}

/**
 * Capture performance metric
 */
export function capturePerformanceMetric(
  name: string,
  duration: number,
  tags: Record<string, string> = {}
) {
  const { logger } = Sentry
  
  logger.info(logger.fmt`Performance: ${name} completed in ${duration}ms`, {
    metric_name: name,
    duration_ms: duration,
    ...tags,
  })
}

/**
 * Create a performance span for an operation
 */
export function startPerformanceSpan<T>(
  operation: string,
  name: string,
  fn: (span: Sentry.Span) => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      op: operation,
      name: name,
    },
    fn
  )
}
