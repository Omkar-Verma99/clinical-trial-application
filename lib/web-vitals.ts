/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals: LCP, CLS, INP, FID, TTFB
 * Reports metrics for performance analysis
 */

export interface WebVital {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

/**
 * Measure Web Vitals metrics
 * LCP: Largest Contentful Paint (target: < 2.5s)
 * CLS: Cumulative Layout Shift (target: < 0.1)
 * INP: Interaction to Next Paint (target: < 200ms)
 * FID: First Input Delay (target: < 100ms)
 * TTFB: Time to First Byte (target: < 600ms)
 */
export const measureWebVitals = (metric: WebVital) => {
  // Report to analytics or monitoring service
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // Could integrate with:
    // - Google Analytics: gtag
    // - Vercel Analytics: analytics.track
    // - Custom monitoring endpoint
    
    try {
      // Send to custom endpoint
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        })
        
        // Only send in production
        if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
          navigator.sendBeacon(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, data)
        }
      }
    } catch (error) {
      // Silently ignore analytics errors
    }
  }
}

/**
 * Initialize Web Vitals monitoring
 * Should be called once at app initialization
 */
export const initWebVitals = async () => {
  if (typeof window === 'undefined') return

  try {
    const vitals = await import('web-vitals')

    // Measure metrics using the web-vitals API
    if (vitals.onCLS) vitals.onCLS(measureWebVitals)
    if (vitals.onFID) vitals.onFID(measureWebVitals)
    if (vitals.onFCP) vitals.onFCP(measureWebVitals)
    if (vitals.onLCP) vitals.onLCP(measureWebVitals)
    if (vitals.onTTFB) vitals.onTTFB(measureWebVitals)
    if (vitals.onINP) vitals.onINP(measureWebVitals)
  } catch (error) {
    // web-vitals may not be available in some environments
  }
}

/**
 * Get current performance metrics
 */
export const getPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paintEntries = performance.getEntriesByType('paint')
  const firstPaint = paintEntries.find(e => e.name === 'first-paint')?.startTime || 0
  const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0

  return {
    // Navigation Timing
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
    domInteractive: navigation?.domInteractive - navigation?.fetchStart || 0,
    
    // Paint Timing
    firstPaint,
    firstContentfulPaint,
    
    // Resource Timing
    resourcesLoaded: performance.getEntriesByType('resource').length,
    
    // Navigation info
    serverResponseTime: navigation?.responseEnd - navigation?.requestStart || 0,
  }
}

/**
 * Monitor specific element LCP
 */
export const observeLargestContentfulPaint = (callback: (entries: PerformanceEntryList) => void) => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}
  }

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries())
    })

    observer.observe({ entryTypes: ['largest-contentful-paint'] })

    return () => observer.disconnect()
  } catch (error) {
    return () => {}
  }
}

/**
 * Monitor layout shifts
 */
export const observeLayoutShifts = (callback: (entries: PerformanceEntryList) => void) => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}
  }

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries())
    })

    observer.observe({ entryTypes: ['layout-shift'] })

    return () => observer.disconnect()
  } catch (error) {
    return () => {}
  }
}

/**
 * Monitor user interactions
 */
export const observeInteractions = (callback: (entries: PerformanceEntryList) => void) => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}
  }

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries())
    })

    observer.observe({ entryTypes: ['first-input', 'event'] })

    return () => observer.disconnect()
  } catch (error) {
    return () => {}
  }
}
