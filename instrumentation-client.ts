/**
 * Instrumentation Client
 * Sentry initialization for client-side (recommended by Sentry)
 * 
 * This file is automatically loaded by Next.js before any other client code
 * Reference: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs'
import { initSentryClient } from '@/sentry.client.config'

// Initialize Sentry on client side
initSentryClient()

// Export Sentry hooks for Next.js router integration
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
