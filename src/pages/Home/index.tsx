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
// macOS trackpads can emit larger deltas, but usually in a fast stream.
const TRACKPAD_TIME_CUTOFF_MS = 50
// Mouse wheels should advance faster (fewer "ticks" to cross the 50% threshold)
const MOUSE_WHEEL_RANGE = 320

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)

  const videoWrapperRef = useRef<HTMLDivElement | null>(null)
  const footerDrawerRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)
  const animationTimerRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  const gestureTimerRef = useRef<number | null>(null)
  const finalizeTimerRef = useRef<number | null>(null)
  const gestureProgressRef = useRef(0)
  const gestureRafRef = useRef<number | null>(null)
  const gestureDirectionRef = useRef<'next' | 'prev' | null>(null)
  const gestureLockedRef = useRef(false)
  const footerProgressRef = useRef(0)
  const lastWheelTsRef = useRef(0)
  const lastSlideArrivedAtRef = useRef(0)
  const scrollLockYRef = useRef(0)

  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [isGesturing, setIsGesturing] = useState(false)
  const [footerProgress, setFooterProgress] = useState(0) // 0..1
  const [isFooterOpen, setIsFooterOpen] = useState(false)
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
    isAnimatingRef.current = false
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

  const stopGestureRaf = useCallback(() => {
    if (gestureRafRef.current) {
      window.cancelAnimationFrame(gestureRafRef.current)
      gestureRafRef.current = null
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

  const publishGestureProgressImmediate = useCallback(() => {
    // For mouse wheels we want immediate, per-tick updates (no RAF batching),
    // otherwise the first visible movement can look like a jump.
    setGestureProgress(gestureProgressRef.current)
  }, [])

  const publishGestureProgressRaf = useCallback(() => {
    // Trackpads produce a lot of wheel events; RAF-batching makes the gesture feel smoother.
    if (gestureRafRef.current) return
    gestureRafRef.current = window.requestAnimationFrame(() => {
      gestureRafRef.current = null
      setGestureProgress(gestureProgressRef.current)
    })
  }, [])

  const resetGesture = useCallback(() => {
    stopGestureTimer()
    stopFinalizeTimer()
    stopGestureRaf()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    gestureProgressRef.current = 0
    setGestureProgress(0)
    setIncomingIndex(null)
    setDirection(null)
    setIsGesturing(false)
  }, [stopFinalizeTimer, stopGestureRaf, stopGestureTimer])

  const setFooterProgressSafe = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next))
    footerProgressRef.current = v
    setFooterProgress(v)
  }, [])

  const openFooter = useCallback(() => {
    setIsFooterOpen(true)
    setFooterProgressSafe(1)
  }, [setFooterProgressSafe])

  const closeFooter = useCallback(() => {
    setIsFooterOpen(false)
    setFooterProgressSafe(0)
  }, [setFooterProgressSafe])

  const scrollToIndex = useCallback((nextIndex: number) => {
    // If footer overlay is visible/open, close it before navigating sections
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
    const safeIndex = clampIndex(nextIndex)
    if (safeIndex === activeIndex || isAnimatingRef.current) return

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

    stopAnimationTimer()
    isAnimatingRef.current = true
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
      isAnimatingRef.current = false
      // Mark when we *actually* arrived at the last slide.
      // Used to prevent "wild scroll" from opening the footer while transitioning into it.
      lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
      setDirection(null)
      animationTimerRef.current = null
    }, timeout)
  }, [activeIndex, clampIndex, closeFooter, isFooterOpen, lastSlideIndex, stopAnimationTimer])

  const finalizeGesture = useCallback(() => {
    if (isAnimatingRef.current) return
    const dir = gestureDirectionRef.current
    if (!dir) {
      resetGesture()
      return
    }

    const progress = gestureProgressRef.current
    if (progress >= SNAP_THRESHOLD) {
      // On the last slide, scrolling "next" opens footer overlay instead of native scroll below.
      if (dir === 'next' && activeIndex === lastSlideIndex) {
        const canOpenFooter = lastSlideArrivedAtRef.current > 0
          && (performance.now() - lastSlideArrivedAtRef.current) > 220
        resetGesture()
        if (canOpenFooter) openFooter()
        return
      }
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      resetGesture()
      scrollToIndex(nextIndex)
      return
    }

    resetGesture()
  }, [activeIndex, clampIndex, isAnimating, lastSlideIndex, openFooter, resetGesture, scrollToIndex])

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

    // Only hijack scroll when the hero stack actually fills the viewport.
    // This prevents wheel events over the footer from still switching slides.
    const wrapperRect = wrapper.getBoundingClientRect()
    const wrapperTopAligned = Math.abs(wrapperRect.top) <= 2
    const wrapperFillsViewport = wrapperRect.bottom >= window.innerHeight * 0.92
    const shouldHandle = wrapperTopAligned && wrapperFillsViewport
    if (!shouldHandle) return

    let deltaY = event.deltaY || 0
    // Normalize delta across devices
    if (event.deltaMode === 1) deltaY *= 16 // lines -> px-ish
    if (event.deltaMode === 2) deltaY *= window.innerHeight // pages -> px-ish
    if (Math.abs(deltaY) < WHEEL_THRESHOLD) return
    const now = performance.now()
    const wheelDt = now - (lastWheelTsRef.current || 0)
    lastWheelTsRef.current = now
    const isLikelyTrackpad = event.deltaMode === 0 && (Math.abs(deltaY) < TRACKPAD_DELTA_CUTOFF || wheelDt < TRACKPAD_TIME_CUTOFF_MS)
    const absDelta = Math.abs(deltaY)
    // macOS trackpads can sometimes spike; clamping avoids accidental "skip" / jerks.
    const absDeltaClamped = isLikelyTrackpad ? Math.min(absDelta, 120) : absDelta

    // If footer overlay is visible while we're not on the last slide (shouldn't happen),
    // give priority to closing it and do not allow section scroll.
    if (footerProgressRef.current > 0.02 && activeIndex !== lastSlideIndex) {
      event.preventDefault()
      closeFooter()
      return
    }

    // Footer overlay: on the last slide, wheel down opens footer; wheel up closes footer.
    if (activeIndex === lastSlideIndex) {
      const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'
      const footerInGesture = footerProgressRef.current > 0.02 && !isFooterOpen
      const canOpenFooter = lastSlideArrivedAtRef.current > 0
        && (now - lastSlideArrivedAtRef.current) > 220

      // If footer is open:
      if (isFooterOpen) {
        const footerEl = footerDrawerRef.current
        const targetNode = event.target as Node | null
        const isInsideFooter = !!(footerEl && targetNode && footerEl.contains(targetNode))
        const canScrollUpInside =
          !!footerEl && footerEl.scrollHeight > footerEl.clientHeight && footerEl.scrollTop > 0

        // If scrolling up at the top of footer -> close
        if (dir === 'prev' && (!isInsideFooter || !canScrollUpInside)) {
          event.preventDefault()
          closeFooter()
          return
        }

        // If inside footer, let it scroll naturally.
        if (isInsideFooter) return

        // Outside footer: keep overlay open; do not let the page scroll.
        event.preventDefault()
        return
      }

      // If footer is partially visible (trackpad gesture) and user scrolls up — close it, don't change sections.
      if (footerInGesture && dir === 'prev') {
        event.preventDefault()
        closeFooter()
        setIsGesturing(false)
        return
      }

      // Footer closed, wheel down should open it.
      if (dir === 'next') {
        event.preventDefault()
        // Prevent "wild scroll" from opening footer while user is still arriving to the last slide.
        if (!canOpenFooter) return
        if (!isLikelyTrackpad) {
          openFooter()
          return
        }

        // Trackpad: follow until idle, then snap open/close.
        stopFinalizeTimer()
        const wheelRange = Math.min(900, Math.max(260, window.innerHeight * 0.9))
        const nextProgress = Math.min(1, footerProgressRef.current + absDeltaClamped / wheelRange)
        setFooterProgressSafe(nextProgress)
        setIsGesturing(true)
        finalizeTimerRef.current = window.setTimeout(() => {
          finalizeTimerRef.current = null
          if (footerProgressRef.current >= SNAP_THRESHOLD && canOpenFooter) openFooter()
          else closeFooter()
          setIsGesturing(false)
        }, TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
        return
      }
    }

    // Жесткий лок: пока идет анимация — не принимаем новые wheel события
    if (isAnimatingRef.current) {
      event.preventDefault()
      return
    }

    if (gestureLockedRef.current) return

    const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'

    // Boundary: allow native scroll (down from last slide to footer, etc.)
    if (dir === 'prev' && activeIndex === 0) {
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
    const nextProgress = Math.min(1, gestureProgressRef.current + absDeltaClamped / wheelRange)
    gestureProgressRef.current = nextProgress
    if (isLikelyTrackpad) publishGestureProgressRaf()
    else publishGestureProgressImmediate()

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
    closeFooter,
    finalizeGesture,
    isFooterOpen,
    lastSlideIndex,
    openFooter,
    publishGestureProgressImmediate,
    publishGestureProgressRaf,
    resetGesture,
    scheduleFinalize,
    scheduleGestureReset,
    scrollToIndex,
    setFooterProgressSafe,
    stopFinalizeTimer,
    stopGestureTimer,
  ])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    gestureLockedRef.current = false
    touchStartY.current = event.touches[0]?.clientY ?? 0
    resetGesture()
  }, [prefersReducedMotion, resetGesture])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    if (gestureLockedRef.current) return

    const y = event.touches[0]?.clientY ?? 0
    const diff = touchStartY.current - y
    if (Math.abs(diff) < 6) return

    const dir: 'next' | 'prev' = diff > 0 ? 'next' : 'prev'

    // Footer overlay gesture on the last slide (follow finger)
    if (activeIndex === lastSlideIndex) {
      const range = Math.min(780, Math.max(300, window.innerHeight * 0.72))

      // Swipe up -> open
      if (dir === 'next') {
        event.preventDefault()
        setIsGesturing(true)
        setFooterProgressSafe(Math.min(1, Math.abs(diff) / range))
        return
      }

      // Swipe down -> close (only if already open)
      if (dir === 'prev' && isFooterOpen) {
        event.preventDefault()
        setIsGesturing(true)
        const closeAmount = Math.min(1, Math.abs(diff) / range)
        setFooterProgressSafe(1 - closeAmount)
        return
      }
    }

    // Boundary: allow native scroll when at top edge
    if (dir === 'prev' && activeIndex === 0) {
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
    // Touch should feel "1:1" — update immediately (no RAF batching).
    publishGestureProgressImmediate()
  }, [
    activeIndex,
    clampIndex,
    isFooterOpen,
    lastSlideIndex,
    publishGestureProgressImmediate,
    resetGesture,
    scrollToIndex,
    setFooterProgressSafe,
  ])

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimatingRef.current) return
    // Touch: commit/rollback only on release
    gestureLockedRef.current = false
    if (activeIndex === lastSlideIndex) {
      // Commit footer drawer state on release
      if (!isFooterOpen) {
        if (footerProgressRef.current >= SNAP_THRESHOLD) openFooter()
        else closeFooter()
      } else {
        if (footerProgressRef.current <= (1 - SNAP_THRESHOLD)) closeFooter()
        else openFooter()
      }
      setIsGesturing(false)
      return
    }
    finalizeGesture()
  }, [activeIndex, closeFooter, finalizeGesture, isFooterOpen, lastSlideIndex, openFooter])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      if (activeIndex === lastSlideIndex) {
        event.preventDefault()
        openFooter()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex + 1)
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (activeIndex === lastSlideIndex && isFooterOpen) {
        event.preventDefault()
        closeFooter()
        return
      }
      // Если на первом слайде — ничего не делаем
      if (activeIndex === 0) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex - 1)
    }
  }, [activeIndex, closeFooter, isFooterOpen, lastSlideIndex, openFooter, scrollToIndex])

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

  // Lock page scroll while footer overlay is open (prevents accidental background scrolling)
  useEffect(() => {
    if (!isFooterOpen) return
    // Freeze scroll without layout shift (fixed body with preserved scrollY)
    scrollLockYRef.current = window.scrollY || 0
    document.documentElement.style.setProperty('--scroll-lock-top', `-${scrollLockYRef.current}px`)
    document.body.classList.add('footer-drawer-lock')
    return () => {
      document.body.classList.remove('footer-drawer-lock')
      document.documentElement.style.setProperty('--scroll-lock-top', '0px')
      // Restore scroll position
      window.scrollTo(0, scrollLockYRef.current)
    }
  }, [isFooterOpen])

  // Footer drawer can be partially opened during gesture. Use a separate class for styling/alignment
  // without necessarily locking the whole page scroll.
  useEffect(() => {
    const isActive = footerProgress > 0.02
    if (isActive) document.body.classList.add('footer-drawer-active')
    else document.body.classList.remove('footer-drawer-active')
    return () => {
      document.body.classList.remove('footer-drawer-active')
    }
  }, [footerProgress])

  // Safety: footer overlay must ONLY exist on the last slide.
  // If we leave the last slide for any reason (including wild scroll), force-close it.
  useEffect(() => {
    if (activeIndex === lastSlideIndex) return
    lastSlideArrivedAtRef.current = 0
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
  }, [activeIndex, closeFooter, isFooterOpen, lastSlideIndex])

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

      {/* Footer overlay (opens over the 4th video section) */}
      <div
        className={styles.footerBackdrop}
        data-visible={footerProgress > 0.02 ? 'true' : 'false'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--footer-progress' as string]: String(footerProgress) }}
        onClick={closeFooter}
        aria-hidden="true"
      />
      <div
        ref={footerDrawerRef}
        className={styles.footerDrawer}
        data-visible={footerProgress > 0.02 ? 'true' : 'false'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--footer-progress' as string]: String(footerProgress) }}
        onClick={(e) => e.stopPropagation()}
      >
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
