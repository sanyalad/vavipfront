import { useRef, useState, useEffect, useMemo } from 'react'

interface UseScrollRevealOptions {
  /** Only trigger once (default: true) */
  once?: boolean
  /** Margin around the viewport trigger area (default: '-100px') */
  margin?: string
  /** Threshold for intersection (0-1, default: 0.1) */
  threshold?: number
  /** Delay before triggering (ms, default: 0) */
  delay?: number
}

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLElement | null>
  isInView: boolean
  /** CSS styles to apply for the animation */
  style: React.CSSProperties
  /** Motion-compatible animation props */
  motionProps: {
    initial: { opacity: number; y: number }
    animate: { opacity: number; y: number }
    transition: { duration: number; delay: number; ease: number[] }
  }
}

/**
 * Hook for scroll-triggered reveal animations
 * Uses IntersectionObserver for performance
 */
export function useScrollReveal(options: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const {
    once = true,
    margin = '-100px',
    threshold = 0.1,
    delay = 0,
  } = options

  const ref = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Skip if already triggered and once mode
    if (once && hasTriggeredRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsInView(true)
                hasTriggeredRef.current = true
              }, delay)
            } else {
              setIsInView(true)
              hasTriggeredRef.current = true
            }

            if (once) {
              observer.unobserve(element)
            }
          } else if (!once) {
            setIsInView(false)
          }
        })
      },
      {
        rootMargin: margin,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [once, margin, threshold, delay])

  // CSS styles for the animation
  const style: React.CSSProperties = useMemo(() => ({
    opacity: isInView ? 1 : 0,
    transform: isInView ? 'translateY(0)' : 'translateY(30px)',
    transition: `opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)`,
    transitionDelay: `${delay}ms`,
  }), [isInView, delay])

  // Motion-compatible props
  const motionProps = useMemo(() => ({
    initial: { opacity: 0, y: 30 },
    animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    transition: { 
      duration: 0.6, 
      delay: delay / 1000,
      ease: [0.23, 1, 0.32, 1],
    },
  }), [isInView, delay])

  return { ref, isInView, style, motionProps }
}

/**
 * Hook for staggered scroll reveal animations on multiple elements
 */
export function useStaggeredReveal(
  itemCount: number,
  options: UseScrollRevealOptions & { staggerDelay?: number } = {}
) {
  const { staggerDelay = 50, ...revealOptions } = options
  const containerRef = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            if (revealOptions.once !== false) {
              observer.unobserve(element)
            }
          } else if (revealOptions.once === false) {
            setIsInView(false)
          }
        })
      },
      {
        rootMargin: revealOptions.margin || '-100px',
        threshold: revealOptions.threshold || 0.1,
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [revealOptions.margin, revealOptions.threshold, revealOptions.once])

  // Generate props for each item
  const getItemProps = (index: number) => ({
    style: {
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.5s cubic-bezier(0.23, 1, 0.32, 1), transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)`,
      transitionDelay: isInView ? `${index * staggerDelay}ms` : '0ms',
    } as React.CSSProperties,
    motionProps: {
      initial: { opacity: 0, y: 20 },
      animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
      transition: {
        duration: 0.5,
        delay: index * (staggerDelay / 1000),
        ease: [0.23, 1, 0.32, 1],
      },
    },
  })

  return {
    containerRef,
    isInView,
    getItemProps,
  }
}

export default useScrollReveal
