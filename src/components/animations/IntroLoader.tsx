import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import styles from './IntroLoader.module.css'

// Timeline: logo appears, flies up to the header zone, then content reveals.
const LOGO_DISPLAY_TIME = 900
const LOGO_FLY_TIME = 900
const CONTENT_REVEAL_DELAY = 200

const REDUCED_LOGO_DISPLAY_TIME = 120
const REDUCED_LOGO_FLY_TIME = 220
const REDUCED_CONTENT_REVEAL_DELAY = 0

export default function IntroLoader() {
  const { setIntroComplete } = useUIStore()
  const [phase, setPhase] = useState<'logo' | 'fly' | 'hidden'>('logo')
  const loaderRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  // Safety: Clean up intro-active class on mount if it's stuck
  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      // If intro-active is stuck, remove it after a short delay
      const cleanupTimer = setTimeout(() => {
        if (document.body.classList.contains('intro-active') && phase === 'hidden') {
          document.body.classList.remove('intro-active')
          document.body.classList.add('intro-revealed')
        }
      }, 100)
      return () => clearTimeout(cleanupTimer)
    }
  }, [phase])

  // Use layout effect so the intro locks and overlay are applied before first paint (no "blink").
  useLayoutEffect(() => {
    // Safety check: ensure we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) return
    
    // Drive the intro purely off local component state.
    // `isIntroComplete` in the store can be true due to previous sessions/HMR; it must not disable the intro.
    if (phase !== 'logo') return

    // Reduced motion: keep the intro (client request), but make it shorter/simpler.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Блокируем скролл
    document.body.classList.add('intro-active')
    document.body.classList.remove('intro-revealed')

    const logoDisplay = prefersReducedMotion ? REDUCED_LOGO_DISPLAY_TIME : LOGO_DISPLAY_TIME
    const logoFly = prefersReducedMotion ? REDUCED_LOGO_FLY_TIME : LOGO_FLY_TIME
    const revealDelay = prefersReducedMotion ? REDUCED_CONTENT_REVEAL_DELAY : CONTENT_REVEAL_DELAY

    // Timeline анимации
    const flyTimer = window.setTimeout(() => {
      setPhase('fly')
      window.setTimeout(() => {
        if (document.body) {
          document.body.classList.add('intro-revealed')
        }
      }, revealDelay)
    }, logoDisplay)

    const hideTimer = window.setTimeout(() => {
      setPhase('hidden')
      if (document.body) {
        document.body.classList.remove('intro-active')
        document.body.classList.add('intro-revealed')
      }
      setIntroComplete(true)
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
      }
    }, logoDisplay + logoFly)

    timersRef.current = [flyTimer, hideTimer]

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('intro-active')
      }
    }
  }, [phase, setIntroComplete])

  // Fallback timeout
  useEffect(() => {
    if (typeof window === 'undefined') return
    const fallbackTimer = setTimeout(() => {
      if (phase !== 'hidden') {
        setPhase('hidden')
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('intro-active')
        }
        setIntroComplete(true)
      }
    }, 2500)

    return () => clearTimeout(fallbackTimer)
  }, [phase, setIntroComplete])

  if (phase === 'hidden') return null

  const loaderClasses = [
    styles.loader,
    phase === 'fly' && styles.flyUp,
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={loaderRef}
      className={loaderClasses}
      id="intro-loader"
      role="presentation"
      onClick={() => {
        timersRef.current.forEach(clearTimeout)
        setPhase('hidden')
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('intro-active')
          document.body.classList.add('intro-revealed')
        }
        setIntroComplete(true)
      }}
    >
      <img 
        src="/images/logo.png" 
        alt="" 
        className={styles.logo}
        aria-hidden="true"
      />
    </div>
  )
}
