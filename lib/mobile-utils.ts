/**
 * Mobile Optimization Utilities
 * Handles mobile-specific features and optimizations
 */

'use client'

/**
 * Detect if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Detect if device is tablet
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|Android(?!.*Mobile)/.test(ua)
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  
  if (isTablet()) return 'tablet'
  if (isMobileDevice()) return 'mobile'
  return 'desktop'
}

/**
 * Get viewport width
 */
export function getViewportWidth(): number {
  if (typeof window === 'undefined') return 0
  return window.innerWidth
}

/**
 * Detect if landscape orientation
 */
export function isLandscape(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerHeight < window.innerWidth
}

/**
 * Detect if portrait orientation
 */
export function isPortrait(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerHeight > window.innerWidth
}

/**
 * Request full screen for mobile
 */
export async function requestMobileFullscreen(): Promise<boolean> {
  try {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      await elem.requestFullscreen()
      return true
    }
    return false
  } catch (error) {
    console.error('Fullscreen request failed:', error)
    return false
  }
}

/**
 * Lock orientation to portrait (mobile only)
 */
export async function lockPortraitOrientation(): Promise<boolean> {
  try {
    if ('orientation' in screen && 'lock' in screen.orientation) {
      await (screen.orientation as any).lock('portrait-primary')
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to lock orientation:', error)
    return false
  }
}

/**
 * Unlock orientation
 */
export async function unlockOrientation(): Promise<boolean> {
  try {
    if ('orientation' in screen && 'unlock' in screen.orientation) {
      (screen.orientation as any).unlock()
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to unlock orientation:', error)
    return false
  }
}

/**
 * Optimize for mobile forms
 * Returns optimized field props
 */
export function getMobileFormFieldProps(fieldType: 'text' | 'email' | 'phone' | 'date' | 'number') {
  const isMobile = isMobileDevice()
  
  const baseProps = {
    className: isMobile ? 'text-lg p-3' : 'p-2',
  }

  const keyboardProps: Record<string, any> = {
    text: { inputMode: 'text' },
    email: { inputMode: 'email', autoComplete: 'email' },
    phone: { inputMode: 'tel', autoComplete: 'tel' },
    date: { inputMode: 'none', type: 'date' },
    number: { inputMode: 'numeric' },
  }

  return {
    ...baseProps,
    ...keyboardProps[fieldType],
  }
}

/**
 * Get mobile-optimized button size
 */
export function getMobileButtonSize(): 'sm' | 'md' | 'lg' {
  if (typeof window === 'undefined') return 'md'
  
  const width = window.innerWidth
  if (width < 480) return 'lg' // Extra large on small mobile
  if (width < 768) return 'md' // Medium on tablet
  return 'md' // Medium on desktop
}

/**
 * Get mobile-optimized font size
 */
export function getMobileFontSize(breakpoint: 'xs' | 'sm' | 'md' | 'lg' = 'md'): string {
  const sizes: Record<string, string> = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
  }
  return sizes[breakpoint]
}

/**
 * Check if mobile keyboard is visible
 */
export function isMobileKeyboardVisible(): boolean {
  if (typeof window === 'undefined') return false
  
  const viewport = window.innerHeight
  const documentHeight = document.documentElement.clientHeight
  
  return viewport < documentHeight * 0.75
}

/**
 * Get safe area insets (for notch, etc)
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const style = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
  }
}

/**
 * Mobile-friendly toast configuration
 */
export function getMobileToastConfig() {
  const isMobile = isMobileDevice()
  
  return {
    position: isMobile ? 'bottom' : 'top-right' as const,
    duration: isMobile ? 3000 : 4000,
    swipeDirection: isMobile ? 'down' as const : 'right' as const,
  }
}

/**
 * Check if touch is supported
 */
export function isTouchSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

/**
 * Mobile-optimized modal width
 */
export function getMobileModalWidth(): string {
  if (typeof window === 'undefined') return '90vw'
  
  const width = window.innerWidth
  if (width < 480) return '95vw' // Very small mobile
  if (width < 768) return '90vw' // Normal mobile
  return '80vw' // Tablet/Desktop
}

/**
 * Add mobile safe area padding
 */
export function addMobileSafeAreaPadding(element: HTMLElement): void {
  if (!element) return
  
  const insets = getSafeAreaInsets()
  element.style.paddingTop = `max(${element.style.paddingTop || '0px'}, ${insets.top}px)`
  element.style.paddingBottom = `max(${element.style.paddingBottom || '0px'}, ${insets.bottom}px)`
  element.style.paddingLeft = `max(${element.style.paddingLeft || '0px'}, ${insets.left}px)`
  element.style.paddingRight = `max(${element.style.paddingRight || '0px'}, ${insets.right}px)`
}
