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
  const { isIntroComplete, setIntroComplete } = useUIStore()
  const [phase, setPhase] = useState<'logo' | 'fly' | 'hidden'>('logo')
  const loaderRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  // Use layout effect so the intro locks and overlay are applied before first paint (no "blink").
  useLayoutEffect(() => {
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
        document.body.classList.add('intro-revealed')
      }, revealDelay)
    }, logoDisplay)

    const hideTimer = window.setTimeout(() => {
      setPhase('hidden')
      document.body.classList.remove('intro-active')
      document.body.classList.add('intro-revealed')
      setIntroComplete(true)
      window.scrollTo(0, 0)
    }, logoDisplay + logoFly)

    timersRef.current = [flyTimer, hideTimer]

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      document.body.classList.remove('intro-active')
    }
  }, [phase, setIntroComplete])

  // Fallback timeout
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (phase !== 'hidden') {
        setPhase('hidden')
        document.body.classList.remove('intro-active')
        setIntroComplete(true)
      }
    }, 2500)

    return () => clearTimeout(fallbackTimer)
  }, [phase, setIntroComplete])

  if (phase === 'hidden') return null

  const loaderClasses = [
    styles.loader,
    phase === 'fly' && styles.flyUp,
    phase === 'hidden' && styles.hidden,
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
        document.body.classList.remove('intro-active')
        document.body.classList.add('intro-revealed')
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
