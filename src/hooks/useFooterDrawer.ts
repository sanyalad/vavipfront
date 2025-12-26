import { useState, useRef, useCallback, useEffect } from 'react'
import { gsap } from 'gsap'

export interface UseFooterDrawerOptions {
  /** Enable wheel scroll to open/close footer */
  enableWheelScroll?: boolean
}

export interface UseFooterDrawerReturn {
  isFooterOpen: boolean
  isAnimating: boolean
  openFooter: () => void
  closeFooter: () => void
}

/**
 * Hook for managing footer drawer with GSAP animations
 * Handles opening/closing animations and wheel scroll events
 */
export function useFooterDrawer(
  options: UseFooterDrawerOptions = {}
): UseFooterDrawerReturn {
  const { enableWheelScroll = true } = options

  const [isFooterOpen, setIsFooterOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Refs for checking state in event handlers without re-renders
  const isFooterOpenRef = useRef(false)
  const isAnimatingRef = useRef(false)
  const openFooterRef = useRef<(() => void) | null>(null)
  const closeFooterRef = useRef<(() => void) | null>(null)

  // Keep refs in sync with state
  useEffect(() => {
    isFooterOpenRef.current = isFooterOpen
  }, [isFooterOpen])

  useEffect(() => {
    isAnimatingRef.current = isAnimating
  }, [isAnimating])

  const openFooter = useCallback(() => {
    if (isFooterOpenRef.current || isAnimatingRef.current) return

    setIsAnimating(true)
    setIsFooterOpen(true)
    isFooterOpenRef.current = true

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const footer = document.querySelector('[data-footer]') as HTMLElement
      const backdrop = document.querySelector('[data-footer-backdrop]') as HTMLElement

      if (footer && backdrop) {
        // Ensure footer is visible and positioned correctly before animation
        // Clear any existing transforms and set initial state
        gsap.set(footer, {
          clearProps: 'transform',
          visibility: 'visible',
          opacity: 1,
          yPercent: 100, // Start from bottom (off-screen)
          zIndex: 1260,
          display: 'block',
        })

        // Force a reflow to ensure styles are applied
        footer.offsetHeight

        gsap.timeline({ onComplete: () => setIsAnimating(false) })
          .to(backdrop, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
          .set(backdrop, { pointerEvents: 'auto' }, 0)
          .to(footer, {
            yPercent: 0, // Slide up to visible position
            duration: 0.5,
            ease: 'power3.out',
            force3D: true,
            immediateRender: false,
          }, 0)
      } else {
        setIsAnimating(false)
      }
    })
  }, [])

  const closeFooter = useCallback(() => {
    if (!isFooterOpenRef.current || isAnimatingRef.current) return

    setIsAnimating(true)

    const footer = document.querySelector('[data-footer]') as HTMLElement
    const backdrop = document.querySelector('[data-footer-backdrop]') as HTMLElement

    if (footer && backdrop) {
      gsap.timeline({
        onComplete: () => {
          setIsFooterOpen(false)
          isFooterOpenRef.current = false
          setIsAnimating(false)
        },
      })
        .to(footer, { yPercent: 100, duration: 0.4, ease: 'power3.in', force3D: true }, 0)
        .to(backdrop, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.1)
        .set(backdrop, { pointerEvents: 'none' })
    } else {
      setIsFooterOpen(false)
      isFooterOpenRef.current = false
      setIsAnimating(false)
    }
  }, [])

  // Store functions in refs for use in useEffect
  useEffect(() => {
    openFooterRef.current = openFooter
    closeFooterRef.current = closeFooter
  }, [openFooter, closeFooter])

  // Handle wheel scroll to open footer
  useEffect(() => {
    if (!enableWheelScroll) return

    const handleWheel = (e: WheelEvent) => {
      // Check if dropdown is open - if so, don't handle wheel events
      const isDropdownOpen = document.body.classList.contains('dropdown-scroll-lock')
      if (isDropdownOpen) {
        return
      }

      // Don't handle if animating
      if (isAnimatingRef.current) return

      // If footer is open and scrolling up, close it
      if (isFooterOpenRef.current) {
        if (e.deltaY < 0 && closeFooterRef.current) {
          closeFooterRef.current()
        }
        return
      }

      // Prevent default scroll
      e.preventDefault()

      // Scroll down opens footer
      if (e.deltaY > 0 && openFooterRef.current) {
        openFooterRef.current()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [enableWheelScroll])

  return {
    isFooterOpen,
    isAnimating,
    openFooter,
    closeFooter,
  }
}

