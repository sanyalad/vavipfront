import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import VideoSection from '@/components/animations/VideoSection'
import Footer from '@/components/layout/Footer'
import styles from './Home.module.css'

const videoSections = [
  {
    id: 'uzel-vvoda',
    title: 'УЗЕЛ ВВОДА',
    videoSrc: '/videos/background1.webm',
    posterSrc: undefined,
    link: '/catalog/uzel-vvoda',
  },
  {
    id: 'bim',
    title: 'ПРОЕКТИРОВАНИЕ BIM',
    videoSrc: '/videos/background2.webm',
    posterSrc: undefined,
    link: '/services/bim',
  },
  {
    id: 'montazh',
    title: 'МОНТАЖ',
    videoSrc: '/videos/background3.webm',
    posterSrc: undefined,
    link: '/services/montazh',
  },
  {
    id: 'shop',
    title: 'МАГАЗИН',
    videoSrc: '/videos/background4.webm',
    posterSrc: undefined,
    link: '/shop',
  },
]

const WHEEL_THRESHOLD = 1
// Keep JS timing aligned with CSS animation (~550ms) with a small buffer
const SCROLL_DEBOUNCE = 570
// When progress crosses this value we auto-commit to the next/prev section
const SNAP_THRESHOLD = 0.5
// If user stops the gesture before threshold, snap back after a short idle.
// For a regular mouse wheel, ticks can have noticeable gaps, so keep this relatively high.
const WHEEL_GESTURE_IDLE_RESET_MS = 520
// Trackpads emit a stream of small wheel deltas; treat a short pause as "release".
const TRACKPAD_GESTURE_IDLE_FINALIZE_MS = 140
// Heuristic: small deltas usually mean trackpad (mouse wheels are more "steppy").
const TRACKPAD_DELTA_CUTOFF = 55
// Mouse wheels should advance faster (fewer "ticks" to cross the 50% threshold)
const MOUSE_WHEEL_RANGE = 320

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)

  const videoWrapperRef = useRef<HTMLDivElement | null>(null)
  const afterStackRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)
  const animationTimerRef = useRef<number | null>(null)
  const gestureTimerRef = useRef<number | null>(null)
  const finalizeTimerRef = useRef<number | null>(null)
  const gestureProgressRef = useRef(0)
  const gestureDirectionRef = useRef<'next' | 'prev' | null>(null)
  const gestureLockedRef = useRef(false)

  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [isGesturing, setIsGesturing] = useState(false)
  const lastSlideIndex = useMemo(() => videoSections.length - 1, [])

  const clampIndex = useCallback(
    (value: number) => Math.min(Math.max(value, 0), lastSlideIndex),
    [lastSlideIndex],
  )

  const stopAnimationTimer = useCallback(() => {
    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
  }, [])

  const stopGestureTimer = useCallback(() => {
    if (gestureTimerRef.current) {
      window.clearTimeout(gestureTimerRef.current)
      gestureTimerRef.current = null
    }
  }, [])

  const stopFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current) {
      window.clearTimeout(finalizeTimerRef.current)
      finalizeTimerRef.current = null
    }
  }, [])

  const scheduleGestureReset = useCallback((delayMs: number) => {
    stopGestureTimer()
    gestureTimerRef.current = window.setTimeout(() => {
      // If we didn't cross the threshold, snap back
      gestureLockedRef.current = false
      gestureDirectionRef.current = null
      gestureProgressRef.current = 0
      setGestureProgress(0)
      setIncomingIndex(null)
      setDirection(null)
      setIsGesturing(false)
    }, delayMs)
  }, [stopGestureTimer])

  const publishGestureProgress = useCallback(() => {
    // For mouse wheels we want immediate, per-tick updates (no RAF batching),
    // otherwise the first visible movement can look like a jump.
    setGestureProgress(gestureProgressRef.current)
  }, [])

  const resetGesture = useCallback(() => {
    stopGestureTimer()
    stopFinalizeTimer()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    gestureProgressRef.current = 0
    setGestureProgress(0)
    setIncomingIndex(null)
    setDirection(null)
    setIsGesturing(false)
  }, [stopFinalizeTimer, stopGestureTimer])

  const scrollToIndex = useCallback((nextIndex: number) => {
    const safeIndex = clampIndex(nextIndex)
    if (safeIndex === activeIndex || isAnimating) return

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

    stopAnimationTimer()
    // Make sure we exit gesture mode before the commit animation
    setIsGesturing(false)
    setFromIndex(activeIndex)
    setIncomingIndex(safeIndex)
    setDirection(nextDirection)
    setIsAnimating(true)

    const timeout = prefersReducedMotion.current ? 150 : SCROLL_DEBOUNCE
    animationTimerRef.current = window.setTimeout(() => {
      setActiveIndex(safeIndex)
      setIncomingIndex(null)
      setIsAnimating(false)
      setDirection(null)
      animationTimerRef.current = null
    }, timeout)
  }, [activeIndex, clampIndex, isAnimating, stopAnimationTimer])

  const finalizeGesture = useCallback(() => {
    if (isAnimating) return
    const dir = gestureDirectionRef.current
    if (!dir) {
      resetGesture()
      return
    }

    const progress = gestureProgressRef.current
    if (progress >= SNAP_THRESHOLD) {
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      resetGesture()
      scrollToIndex(nextIndex)
      return
    }

    resetGesture()
  }, [activeIndex, clampIndex, isAnimating, resetGesture, scrollToIndex])

  const scheduleFinalize = useCallback((delayMs: number) => {
    stopFinalizeTimer()
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeTimerRef.current = null
      finalizeGesture()
    }, delayMs)
  }, [finalizeGesture, stopFinalizeTimer])

  const handleWheel = useCallback((event: WheelEvent) => {
    if (prefersReducedMotion.current) return

    // If header dropdown is open, let the dropdown scroll (do not hijack wheel for video sections).
    if (document.body.classList.contains('dropdown-scroll-lock')) return

    const wrapper = videoWrapperRef.current
    if (!wrapper) return
    const afterStack = afterStackRef.current

    // Only hijack scroll when the hero stack actually fills the viewport.
    // This prevents wheel events over the footer from still switching slides.
    const wrapperRect = wrapper.getBoundingClientRect()
    const wrapperTopAligned = Math.abs(wrapperRect.top) <= 2
    const wrapperFillsViewport = wrapperRect.bottom >= window.innerHeight * 0.92
    // Additionally, do NOT hijack while the footer area is even slightly visible.
    // This lets native scroll bring the page back to the stack before we start switching slides.
    const afterTop = afterStack?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
    const footerNotVisible = afterTop >= window.innerHeight - 2
    const shouldHandle = wrapperTopAligned && wrapperFillsViewport && footerNotVisible
    if (!shouldHandle) return

    let deltaY = event.deltaY || 0
    // Normalize delta across devices
    if (event.deltaMode === 1) deltaY *= 16 // lines -> px-ish
    if (event.deltaMode === 2) deltaY *= window.innerHeight // pages -> px-ish
    if (Math.abs(deltaY) < WHEEL_THRESHOLD) return

    // После возврата из каталога убеждаемся, что мы не в состоянии анимации
    if (isAnimating) {
      event.preventDefault()
      return
    }

    if (gestureLockedRef.current) return

    const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'
    const isLikelyTrackpad = event.deltaMode === 0 && Math.abs(deltaY) < TRACKPAD_DELTA_CUTOFF

    // Boundary: allow native scroll (down from last slide to footer, etc.)
    if ((dir === 'prev' && activeIndex === 0) || (dir === 'next' && activeIndex === lastSlideIndex)) {
      resetGesture()
      return
    }

    event.preventDefault()

    // Mouse wheel: переключаемся сразу с 1 тика (перфекционистично и без "накопления").
    // Trackpad остаётся "follow until release".
    if (!isLikelyTrackpad) {
      resetGesture()
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      scrollToIndex(nextIndex)
      return
    }

    // If direction changed, restart gesture
    if (gestureDirectionRef.current !== dir) {
      gestureDirectionRef.current = dir
      gestureProgressRef.current = 0
      setIsGesturing(true)
      setFromIndex(activeIndex)
      setIncomingIndex(clampIndex(activeIndex + (dir === 'next' ? 1 : -1)))
      setDirection(dir)
      setIsAnimating(false)
      setGestureProgress(0)
    }

    stopGestureTimer()
    stopFinalizeTimer()

    const wheelRange = isLikelyTrackpad
      ? Math.min(900, Math.max(260, window.innerHeight * 0.9))
      : MOUSE_WHEEL_RANGE
    const nextProgress = Math.min(1, gestureProgressRef.current + Math.abs(deltaY) / wheelRange)
    gestureProgressRef.current = nextProgress
    publishGestureProgress()

    // Trackpad: follow until "release" (idle), then commit/rollback
    if (isLikelyTrackpad) {
      scheduleFinalize(TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
      return
    }

    // Mouse wheel: keep the older snappy behavior
    if (nextProgress >= SNAP_THRESHOLD) {
      gestureLockedRef.current = true
      finalizeGesture()
      return
    }

    scheduleGestureReset(WHEEL_GESTURE_IDLE_RESET_MS)
  }, [
    activeIndex,
    clampIndex,
    isAnimating,
    lastSlideIndex,
    finalizeGesture,
    publishGestureProgress,
    resetGesture,
    scheduleFinalize,
    scheduleGestureReset,
    scrollToIndex,
    stopFinalizeTimer,
    stopGestureTimer,
  ])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimating) return
    gestureLockedRef.current = false
    touchStartY.current = event.touches[0]?.clientY ?? 0
    resetGesture()
  }, [isAnimating, prefersReducedMotion, resetGesture])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimating) return
    if (gestureLockedRef.current) return

    const y = event.touches[0]?.clientY ?? 0
    const diff = touchStartY.current - y
    if (Math.abs(diff) < 6) return

    const dir: 'next' | 'prev' = diff > 0 ? 'next' : 'prev'

    // Boundary: allow native scroll when at ends
    if ((dir === 'prev' && activeIndex === 0) || (dir === 'next' && activeIndex === lastSlideIndex)) {
      resetGesture()
      return
    }

    event.preventDefault()

    if (gestureDirectionRef.current !== dir) {
      gestureDirectionRef.current = dir
      setIsGesturing(true)
      setFromIndex(activeIndex)
      setIncomingIndex(clampIndex(activeIndex + (dir === 'next' ? 1 : -1)))
      setDirection(dir)
      setIsAnimating(false)
    }

    const range = Math.min(780, Math.max(300, window.innerHeight * 0.72))
    const nextProgress = Math.min(1, Math.abs(diff) / range)
    gestureProgressRef.current = nextProgress
    publishGestureProgress()
  }, [activeIndex, clampIndex, isAnimating, lastSlideIndex, publishGestureProgress, resetGesture, scrollToIndex])

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimating) return
    // Touch: commit/rollback only on release
    gestureLockedRef.current = false
    finalizeGesture()
  }, [finalizeGesture, isAnimating, prefersReducedMotion])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimating) return
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      if (activeIndex === lastSlideIndex) return
      event.preventDefault()
      scrollToIndex(activeIndex + 1)
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      // Если на первом слайде — ничего не делаем
      if (activeIndex === 0) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex - 1)
    }
  }, [activeIndex, isAnimating, lastSlideIndex, scrollToIndex])

  // Wheel + touch listeners on window to avoid native scroll дергания
  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, handleWheel])

  // Touch listeners on wrapper (passive:false for touchmove to prevent native scroll)
  useEffect(() => {
    const wrapper = videoWrapperRef.current
    if (!wrapper) return
    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false })
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true })
    wrapper.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart)
      wrapper.removeEventListener('touchmove', handleTouchMove)
      wrapper.removeEventListener('touchend', handleTouchEnd)
      wrapper.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchEnd, handleTouchMove, handleTouchStart])

  // Чистим таймер анимации при размонтировании
  useEffect(() => {
    return () => {
      stopAnimationTimer()
      stopGestureTimer()
      stopFinalizeTimer()
    }
  }, [stopAnimationTimer, stopFinalizeTimer, stopGestureTimer])

  // Preload video metadata using link rel="preload" (more efficient than hidden DOM elements)
  useEffect(() => {
    const links: HTMLLinkElement[] = []
    
    videoSections.forEach((section, idx) => {
      // Preload first two видео с высоким приоритетом, остальные — фоном
      const isHighPriority = idx < 2
      
      // Preload WebM format (preferred)
      const webmLink = document.createElement('link')
      webmLink.rel = 'preload'
      webmLink.as = 'video'
      webmLink.href = section.videoSrc
      webmLink.type = 'video/webm'
      webmLink.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(webmLink)
      links.push(webmLink)
      
      // Preload MP4 fallback
      const mp4Link = document.createElement('link')
      mp4Link.rel = 'preload'
      mp4Link.as = 'video'
      mp4Link.href = section.videoSrc.replace('.webm', '.mp4')
      mp4Link.type = 'video/mp4'
      mp4Link.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(mp4Link)
      links.push(mp4Link)
    })

    return () => {
      // Cleanup preload links
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [])

  // Track first video readiness
  useEffect(() => {
    const videoWrapper = videoWrapperRef.current
    if (!videoWrapper) return

    const checkFirstVideoReady = () => {
      const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
      if (firstVideo && firstVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        return true
      }
      return false
    }

    // Check immediately
    if (checkFirstVideoReady()) return

    // Listen for video events
    const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
    if (!firstVideo) return

    const handleReady = () => {
    }

    firstVideo.addEventListener('loadedmetadata', handleReady, { once: true })
    firstVideo.addEventListener('canplay', handleReady, { once: true })

    return () => {
      firstVideo.removeEventListener('loadedmetadata', handleReady)
      firstVideo.removeEventListener('canplay', handleReady)
    }
  }, [])

  // Header height variable + body scroll lock
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setHeaderHeight = () => {
      const header = document.querySelector('header')
      const h = header?.offsetHeight || 0
      document.documentElement.style.setProperty('--header-h', h + 'px')
    }

    setHeaderHeight()
    window.addEventListener('resize', setHeaderHeight)

    return () => {
      window.removeEventListener('resize', setHeaderHeight)
    }
  }, [])

  // Hash-based navigation (/#catalog, /#shop, etc.)
  useEffect(() => {
    if (!location.hash) return
    const hash = location.hash.replace('#', '')

    const targetId = hash

    const targetIndex = videoSections.findIndex((section) => section.id === targetId)

    if (targetIndex >= 0) {
      scrollToIndex(targetIndex)
    }
  }, [location.hash, scrollToIndex])

  // Во время анимации:
  // При скролле вниз: fromIndex -> prev (остается), activeIndex -> next (выезжает снизу)
  // При скролле вверх: activeIndex -> prev (выезжает сверху), fromIndex -> next (уходит вниз)
  const visibleNextIndex = useMemo(() => {
    return direction === 'next'
      ? incomingIndex
      : (direction === 'prev' ? fromIndex : null)
  }, [direction, incomingIndex, fromIndex])
  
  const visiblePrevIndex = useMemo(() => {
    return direction === 'next'
      ? fromIndex
      : (direction === 'prev' ? incomingIndex : null)
  }, [direction, fromIndex, incomingIndex])

  return (
    <motion.div
      className={styles.home}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Video Sections Wrapper */}
      <div
        ref={videoWrapperRef}
        className={styles.videoSectionsWrapper}
        data-direction={direction || 'idle'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--gesture-progress' as string]: String(gestureProgress) }}
      >
        {videoSections.map((section, index) => {
          // Во время анимации next имеет приоритет над active
          const isNext = visibleNextIndex === index
          const isPrev = visiblePrevIndex === index
          // active только если не next и не prev во время анимации
          const isActive = index === activeIndex && !isNext && !isPrev
          const nextVideoSrc = index < videoSections.length - 1 ? videoSections[index + 1].videoSrc : undefined

          return (
            <VideoSection
              key={section.id}
              {...section}
              index={index}
              isLast={index === videoSections.length - 1}
              isActive={isActive}
              isNext={isNext}
              isPrev={isPrev}
              direction={direction}
              nextVideoSrc={nextVideoSrc}
            />
          )
        })}
      </div>

      {/* Footer after the hero stack (normal native scroll) */}
      <div ref={afterStackRef} className={styles.afterStack}>
        <Footer />
      </div>

      {/* Mobile Navigation Strip */}
      <nav className={styles.mobileStrip} aria-label="Навигация по разделам">
        {videoSections.map((section, index) => (
          <button
            key={section.id}
            className={styles.mobileNavItem}
            data-section={section.id}
            onClick={() => scrollToIndex(index)}
          >
            {section.title}
          </button>
        ))}
      </nav>
    </motion.div>
  )
}
