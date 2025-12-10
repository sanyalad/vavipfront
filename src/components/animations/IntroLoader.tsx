import { useEffect, useState, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import styles from './IntroLoader.module.css'

// Timeline (короче и с плавным затуханием)
const LOGO_DISPLAY_TIME = 620
const LOGO_FADE_TIME = 300
const CURTAIN_TIME = 360

export default function IntroLoader() {
  const { isIntroComplete, setIntroComplete } = useUIStore()
  const [phase, setPhase] = useState<'logo' | 'fade' | 'curtain' | 'hidden'>('logo')
  const loaderRef = useRef<HTMLDivElement>(null)
  const hasStartedRef = useRef(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    // Предотвращаем повторный запуск
    if (hasStartedRef.current || isIntroComplete) return
    hasStartedRef.current = true

    // Проверка reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setPhase('hidden')
      setIntroComplete(true)
      return
    }

    // Блокируем скролл
    document.body.classList.add('intro-active')

    // Timeline анимации
    const fadeTimer = window.setTimeout(() => {
      setPhase('fade')
    }, LOGO_DISPLAY_TIME)
    const curtainTimer = window.setTimeout(() => {
      setPhase('curtain')
    }, LOGO_DISPLAY_TIME + LOGO_FADE_TIME)
    const hideTimer = window.setTimeout(() => {
      setPhase('hidden')
      document.body.classList.remove('intro-active')
      setIntroComplete(true)
      window.scrollTo(0, 0)
    }, LOGO_DISPLAY_TIME + LOGO_FADE_TIME + CURTAIN_TIME)

    timersRef.current = [fadeTimer, curtainTimer, hideTimer]

    return () => {
      timersRef.current.forEach(clearTimeout)
      document.body.classList.remove('intro-active')
    }
  }, [isIntroComplete, setIntroComplete])

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

  if (isIntroComplete && phase === 'hidden') return null

  const loaderClasses = [
    styles.loader,
    phase === 'fade' && styles.fadeLogo,
    phase === 'curtain' && styles.curtainUp,
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
        setIntroComplete(true)
      }}
    >
      <img 
        src="/images/logo.png" 
        alt="" 
        className={styles.logo}
        aria-hidden="true"
      />
      <div className={styles.curtain} />
    </div>
  )
}
