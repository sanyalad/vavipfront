/**
 * Platform detection utilities for macOS and other platforms
 */

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux' | 'unknown'
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'unknown'
export type DeviceType = 'desktop' | 'tablet' | 'mobile'

export interface PlatformInfo {
  platform: Platform
  browser: Browser
  deviceType: DeviceType
  isMac: boolean
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  isDesktop: boolean
  isSafari: boolean
  isChrome: boolean
  hasTrackpad: boolean
  isRetina: boolean
}

// Cache platform detection result
let cachedPlatformInfo: PlatformInfo | null = null

/**
 * Detects the current platform, browser, and device type
 */
export function detectPlatform(): PlatformInfo {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo
  }

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // SSR fallback
    return {
      platform: 'unknown',
      browser: 'unknown',
      deviceType: 'desktop',
      isMac: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isDesktop: true,
      isSafari: false,
      isChrome: false,
      hasTrackpad: false,
      isRetina: false,
    }
  }

  const userAgent = navigator.userAgent
  const platform = navigator.platform

  // Platform detection
  const isMac = /Mac|iPhone|iPad|iPod/i.test(userAgent) && !/Windows/i.test(userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const isAndroid = /Android/i.test(userAgent)
  const isWindows = /Win/i.test(platform) || /Windows/i.test(userAgent)
  const isLinux = /Linux/i.test(platform) && !/Android/i.test(userAgent)

  let detectedPlatform: Platform = 'unknown'
  if (isMac && !isIOS) {
    detectedPlatform = 'macos'
  } else if (isIOS) {
    detectedPlatform = 'ios'
  } else if (isAndroid) {
    detectedPlatform = 'android'
  } else if (isWindows) {
    detectedPlatform = 'windows'
  } else if (isLinux) {
    detectedPlatform = 'linux'
  }

  // Browser detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent) || 
                   (isMac && !/Chrome|Firefox|Edge/i.test(userAgent))
  const isChrome = /Chrome/i.test(userAgent) && !/Edge|OPR|Opera/i.test(userAgent)
  const isFirefox = /Firefox/i.test(userAgent)
  const isEdge = /Edge|Edg/i.test(userAgent)

  let detectedBrowser: Browser = 'unknown'
  if (isSafari) {
    detectedBrowser = 'safari'
  } else if (isChrome) {
    detectedBrowser = 'chrome'
  } else if (isFirefox) {
    detectedBrowser = 'firefox'
  } else if (isEdge) {
    detectedBrowser = 'edge'
  }

  // Device type detection
  const isMobile = isIOS || isAndroid || /Mobile/i.test(userAgent)
  const isTablet = /iPad/i.test(userAgent) || 
                   (isAndroid && !/Mobile/i.test(userAgent)) ||
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && !isMobile)

  let deviceType: DeviceType = 'desktop'
  if (isMobile) {
    deviceType = 'mobile'
  } else if (isTablet) {
    deviceType = 'tablet'
  }

  // Trackpad detection (heuristic: macOS desktop with Safari or Chrome)
  const hasTrackpad = isMac && !isIOS && (isSafari || isChrome)

  // Retina display detection
  const isRetina = Boolean(window.devicePixelRatio && window.devicePixelRatio >= 2)

  cachedPlatformInfo = {
    platform: detectedPlatform,
    browser: detectedBrowser,
    deviceType,
    isMac,
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile && !isTablet,
    isSafari,
    isChrome,
    hasTrackpad,
    isRetina,
  }

  return cachedPlatformInfo as PlatformInfo
}

/**
 * React hook for platform detection
 * Returns cached platform info (platform detection is stable during app lifecycle)
 */
export function usePlatform(): PlatformInfo {
  // Platform detection is stable during app lifecycle, so we can safely return cached result
  // If needed in the future, we can add useState/useEffect for dynamic updates
  return detectPlatform()
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return detectPlatform().isMac
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return detectPlatform().isIOS
}

/**
 * Check if running on mobile device
 */
export function isMobile(): boolean {
  return detectPlatform().isMobile
}

/**
 * Check if running on Safari
 */
export function isSafari(): boolean {
  return detectPlatform().isSafari
}

