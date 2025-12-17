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
const SCROLL_DEBOUNCE = 520
const SNAP_THRESHOLD = 0.5
const WHEEL_GESTURE_IDLE_RESET_MS = 520
const TRACKPAD_GESTURE_IDLE_FINALIZE_MS = 110
const TRACKPAD_MIN_VELOCITY_TO_CONTINUE = 0.8
const TRACKPAD_VELOCITY_SAMPLE_WINDOW_MS = 50
const TRACKPAD_DELTA_CUTOFF = 85
const TRACKPAD_STREAM_CUTOFF_MS = 180
const TRACKPAD_START_DELTA_PX = 6
const TRACKPAD_START_ACCUM_WINDOW_MS = 120
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
  const lastTrackpadLogTsRef = useRef(0)
  const lastWheelClassifyLogTsRef = useRef(0)
  const lastTrackpadIgnoreLogTsRef = useRef(0)
  const trackpadIgnoredCountRef = useRef(0)
  const trackpadStartSumRef = useRef(0)
  const trackpadStartSumTsRef = useRef(0)
  const lastSlideArrivedAtRef = useRef(0)
  const lastTrackpadDeltaRef = useRef(0)
  const lastTrackpadDeltaTsRef = useRef(0)
  const finalizeAttemptCountRef = useRef(0)
  const lastFinalizeTimeRef = useRef(0)

  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [isGesturing, setIsGesturing] = useState(false)
  const [footerProgress, setFooterProgress] = useState(0)
  const [isFooterOpen, setIsFooterOpen] = useState(false)
  const lastSlideIndex = useMemo(() => videoSections.length - 1, [])

  const tpLog = useCallback((hypothesisId: string, message: string, data: Record<string, unknown>) => {
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'trackpad-v6-caption-fix',
        hypothesisId,
        location: 'frontend/src/pages/Home/index.tsx:tpLog',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }, [])

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
      gestureLockedRef.current = false
      gestureDirectionRef.current = null
      gestureProgressRef.current = 0
      setGestureProgress(0)
      setIncomingIndex(null)
      setDirection(null)
      setIsGesturing(false)
    }, delayMs)
  }, [stopGestureTimer])

  const publishGestureProgressRaf = useCallback(() => {
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
    finalizeAttemptCountRef.current = 0
  }, [stopFinalizeTimer, stopGestureRaf, stopGestureTimer])

  const setFooterProgressSafe = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next))
    footerProgressRef.current = v
    setFooterProgress(v)
  }, [])

  const openFooter = useCallback(() => {
    tpLog('F5', 'openFooter() called', {
      activeIndex,
      lastSlideIndex,
      footerProgress: footerProgressRef.current,
      isFooterOpen,
    })
    setIsFooterOpen(true)
    setFooterProgressSafe(1)
    requestAnimationFrame(() => {
      footerDrawerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [setFooterProgressSafe, activeIndex, lastSlideIndex, isFooterOpen, tpLog])

  const closeFooter = useCallback(() => {
    tpLog('F5', 'closeFooter() called', {
      activeIndex,
      lastSlideIndex,
      footerProgress: footerProgressRef.current,
      isFooterOpen,
    })
    setIsFooterOpen(false)
    setFooterProgressSafe(0)
  }, [setFooterProgressSafe, activeIndex, lastSlideIndex, isFooterOpen, tpLog])

  const scrollToIndex = useCallback((nextIndex: number) => {
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
    const safeIndex = clampIndex(nextIndex)
    if (safeIndex === activeIndex || isAnimatingRef.current) return

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

    stopAnimationTimer()
    isAnimatingRef.current = true
    // CRITICAL: immediately hide gesture state before animation starts
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
      lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
      setDirection(null)
      // CRITICAL: ensure gesture state is cleared after animation
      setIsGesturing(false)
      animationTimerRef.current = null
    }, timeout)
  }, [activeIndex, clampIndex, closeFooter, isFooterOpen, lastSlideIndex, stopAnimationTimer])

  const finalizeGesture = useCallback(() => {
    if (isAnimatingRef.current) {
      tpLog('TP3_GUARD', 'finalizeGesture blocked: already animating', {})
      return
    }
    const dir = gestureDirectionRef.current
    if (!dir) {
      resetGesture()
      return
    }

    const progress = gestureProgressRef.current
    const now = performance.now()
    if (now - lastFinalizeTimeRef.current < 100) {
      tpLog('TP3_GUARD', 'finalizeGesture blocked: debounce', {
        timeSinceLastFinalize: now - lastFinalizeTimeRef.current,
        attemptCount: finalizeAttemptCountRef.current,
      })
      return
    }
    lastFinalizeTimeRef.current = now
    finalizeAttemptCountRef.current += 1

    tpLog('TP3', 'finalizeGesture: decide', {
      activeIndex,
      incomingIndex,
      lastSlideIndex,
      dir,
      progress,
      isFooterOpen,
      footerProgress: footerProgressRef.current,
      isAnimatingRef: isAnimatingRef.current,
      attemptCount: finalizeAttemptCountRef.current,
    })

    if (progress >= SNAP_THRESHOLD) {
      if (dir === 'next' && activeIndex === lastSlideIndex) {
        const canOpenFooter = lastSlideArrivedAtRef.current > 0
          && (performance.now() - lastSlideArrivedAtRef.current) > 220
        resetGesture()
        tpLog('TP4', 'finalizeGesture: openFooter?', {
          canOpenFooter,
          activeIndex,
          lastSlideIndex,
          dir,
          progress,
        })
        if (canOpenFooter) openFooter()
        return
      }
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      resetGesture()
      tpLog('TP4', 'finalizeGesture: commit scrollToIndex', {
        activeIndex,
        nextIndex,
        dir,
        progress,
      })
      scrollToIndex(nextIndex)
      return
    }

    tpLog('TP3', 'finalizeGesture: snap back', {
      activeIndex,
      dir,
      progress,
    })
    resetGesture()
  }, [activeIndex, clampIndex, isAnimating, lastSlideIndex, openFooter, resetGesture, scrollToIndex, tpLog])

  const scheduleFinalize = useCallback((delayMs: number) => {
    stopFinalizeTimer()
    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeTimerRef.current = null
      tpLog('TP2', 'scheduleFinalize: fired', {
        delayMs,
        activeIndex,
        incomingIndex,
        dir: gestureDirectionRef.current,
        progress: gestureProgressRef.current,
        isAnimatingRef: isAnimatingRef.current,
      })
      finalizeGesture()
    }, delayMs)
  }, [finalizeGesture, stopFinalizeTimer, activeIndex, incomingIndex, tpLog])

  const handleWheel = useCallback((event: WheelEvent) => {
    if (prefersReducedMotion.current) return

    if (document.body.classList.contains('dropdown-scroll-lock')) return

    const wrapper = videoWrapperRef.current
    if (!wrapper) return

    const wrapperRect = wrapper.getBoundingClientRect()
    const wrapperTopAligned = Math.abs(wrapperRect.top) <= 2
    const wrapperFillsViewport = wrapperRect.bottom >= window.innerHeight * 0.92
    const shouldHandle = wrapperTopAligned && wrapperFillsViewport
    if (!shouldHandle) return

    let deltaY = event.deltaY || 0
    if (event.deltaMode === 1) deltaY *= 16
    if (event.deltaMode === 2) deltaY *= window.innerHeight
    if (Math.abs(deltaY) < WHEEL_THRESHOLD) return
    
    const now = performance.now()
    const wheelDt = now - (lastWheelTsRef.current || 0)
    lastWheelTsRef.current = now
    
    const isLikelyTrackpad =
      event.deltaMode === 0 && (Math.abs(deltaY) < TRACKPAD_DELTA_CUTOFF || wheelDt < TRACKPAD_STREAM_CUTOFF_MS)
    const absDelta = Math.abs(deltaY)
    const absDeltaClamped = isLikelyTrackpad ? Math.min(absDelta, 120) : absDelta

    if (isLikelyTrackpad) {
      const velocitySampleTs = lastTrackpadDeltaTsRef.current || 0
      if (velocitySampleTs && now - velocitySampleTs < TRACKPAD_VELOCITY_SAMPLE_WINDOW_MS) {
        const deltaTime = now - velocitySampleTs
        const velocity = (absDeltaClamped + Math.abs(lastTrackpadDeltaRef.current)) / deltaTime
        lastTrackpadDeltaRef.current = absDeltaClamped
        lastTrackpadDeltaTsRef.current = now
        
        if (velocity > TRACKPAD_MIN_VELOCITY_TO_CONTINUE && gestureDirectionRef.current) {
          stopFinalizeTimer()
          scheduleFinalize(TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
          tpLog('TP2_VEL', 'high velocity detected, extended finalize', {
            velocity: Math.round(velocity * 100) / 100,
            threshold: TRACKPAD_MIN_VELOCITY_TO_CONTINUE,
            absDeltaClamped,
            deltaTime,
          })
        }
      } else {
        lastTrackpadDeltaRef.current = absDeltaClamped
        lastTrackpadDeltaTsRef.current = now
      }
    }

    if (isLikelyTrackpad && !gestureDirectionRef.current && absDelta < TRACKPAD_START_DELTA_PX) {
      event.preventDefault()
      const lastTs = trackpadStartSumTsRef.current || 0
      if (!lastTs || (now - lastTs) > TRACKPAD_START_ACCUM_WINDOW_MS) {
        trackpadStartSumRef.current = 0
      }
      trackpadStartSumTsRef.current = now
      trackpadStartSumRef.current += absDelta

      trackpadIgnoredCountRef.current += 1
      if ((now - (lastTrackpadIgnoreLogTsRef.current || 0)) > 200) {
        lastTrackpadIgnoreLogTsRef.current = now
        tpLog('TP5', 'trackpad tiny-delta accumulated', {
          activeIndex,
          incomingIndex,
          absDelta,
          sum: trackpadStartSumRef.current,
          ignoredCount: trackpadIgnoredCountRef.current,
        })
        trackpadIgnoredCountRef.current = 0
      }

      if (trackpadStartSumRef.current < TRACKPAD_START_DELTA_PX) {
        return
      }

      trackpadStartSumRef.current = 0
    } else {
      trackpadIgnoredCountRef.current = 0
      trackpadStartSumRef.current = 0
    }

    if (isLikelyTrackpad && (now - (lastTrackpadLogTsRef.current || 0)) > 90) {
      lastTrackpadLogTsRef.current = now
      tpLog('TP1', 'wheel(trackpad) sample', {
        activeIndex,
        deltaY,
        absDelta,
        absDeltaClamped,
        wheelDt,
        progress: gestureProgressRef.current,
        dir: gestureDirectionRef.current,
      })
    }

    if (
      event.deltaMode === 0
      && !isLikelyTrackpad
      && (now - (lastWheelClassifyLogTsRef.current || 0)) > 90
    ) {
      lastWheelClassifyLogTsRef.current = now
      tpLog('TP1', 'wheel(deltaMode0) classified as mouse', {
        activeIndex,
        deltaY,
        absDelta,
        wheelDt,
      })
    }

    if (footerProgressRef.current > 0.02 && activeIndex !== lastSlideIndex) {
      event.preventDefault()
      closeFooter()
      return
    }

    if (activeIndex === lastSlideIndex) {
      const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'
      const footerInGesture = footerProgressRef.current > 0.02 && !isFooterOpen
      const canOpenFooter = lastSlideArrivedAtRef.current > 0
        && (now - lastSlideArrivedAtRef.current) > 220

      if (isFooterOpen) {
        const footerEl = footerDrawerRef.current
        const targetNode = event.target as Node | null
        const isInsideFooter = !!(footerEl && targetNode && footerEl.contains(targetNode))
        const canScrollUpInside =
          !!footerEl && footerEl.scrollHeight > footerEl.clientHeight && footerEl.scrollTop > 0

        if (dir === 'prev' && (!isInsideFooter || !canScrollUpInside)) {
          event.preventDefault()
          closeFooter()
          return
        }

        if (isInsideFooter) return

        event.preventDefault()
        return
      }

      if (footerInGesture && dir === 'prev') {
        event.preventDefault()
        closeFooter()
        setIsGesturing(false)
        return
      }

      if (dir === 'next') {
        event.preventDefault()
        if (!canOpenFooter) return
        if (!isLikelyTrackpad) {
          openFooter()
          return
        }

        stopFinalizeTimer()
        const wheelRange = Math.min(800, Math.max(280, window.innerHeight * 0.85))
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

    if (isAnimatingRef.current) {
      event.preventDefault()
      return
    }

    if (gestureLockedRef.current) return

    const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'

    if (dir === 'prev' && activeIndex === 0) {
      resetGesture()
      return
    }

    event.preventDefault()

    if (!isLikelyTrackpad) {
      resetGesture()
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      scrollToIndex(nextIndex)
      return
    }

    if (gestureDirectionRef.current !== dir) {
      gestureDirectionRef.current = dir
      gestureProgressRef.current = 0
      setIsGesturing(true)
      setFromIndex(activeIndex)
      setIncomingIndex(clampIndex(activeIndex + (dir === 'next' ? 1 : -1)))
      setDirection(dir)
      setIsAnimating(false)
      setGestureProgress(0)
      finalizeAttemptCountRef.current = 0
      lastFinalizeTimeRef.current = 0
      
      tpLog('TP2', 'trackpad: new gesture dir', {
        activeIndex,
        incomingIndex: clampIndex(activeIndex + (dir === 'next' ? 1 : -1)),
        dir,
      })
    }

    stopGestureTimer()
    stopFinalizeTimer()

    const wheelRange = Math.min(800, Math.max(280, window.innerHeight * 0.85))
    const prevProgress = gestureProgressRef.current
    const nextProgress = Math.min(1, prevProgress + absDeltaClamped / wheelRange)
    gestureProgressRef.current = nextProgress
    publishGestureProgressRaf()

    if (isLikelyTrackpad && (now - (lastTrackpadLogTsRef.current || 0)) > 90) {
      lastTrackpadLogTsRef.current = now
      tpLog('TP2', 'trackpad: progress update', {
        activeIndex,
        incomingIndex,
        dir,
        wheelRange,
        absDeltaClamped,
        prevProgress,
        nextProgress,
      })
    }

    if (isLikelyTrackpad) {
      scheduleFinalize(TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
      return
    }

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
    publishGestureProgressRaf,
    resetGesture,
    scheduleFinalize,
    scheduleGestureReset,
    scrollToIndex,
    setFooterProgressSafe,
    stopFinalizeTimer,
    stopGestureTimer,
    tpLog,
  ])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    gestureLockedRef.current = false
    touchStartY.current = event.touches[0]?.clientY ?? 0
    resetGesture()
  }, [resetGesture])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    if (gestureLockedRef.current) return

    const y = event.touches[0]?.clientY ?? 0
    const diff = touchStartY.current - y
    if (Math.abs(diff) < 6) return

    const dir: 'next' | 'prev' = diff > 0 ? 'next' : 'prev'

    if (activeIndex === lastSlideIndex) {
      const range = Math.min(780, Math.max(300, window.innerHeight * 0.72))

      if (dir === 'next') {
        event.preventDefault()
        setIsGesturing(true)
        setFooterProgressSafe(Math.min(1, Math.abs(diff) / range))
        return
      }

      if (dir === 'prev' && isFooterOpen) {
        event.preventDefault()
        setIsGesturing(true)
        const closeAmount = Math.min(1, Math.abs(diff) / range)
        setFooterProgressSafe(1 - closeAmount)
        return
      }
    }

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
    setGestureProgress(nextProgress)
  }, [
    activeIndex,
    clampIndex,
    isFooterOpen,
    lastSlideIndex,
    resetGesture,
    setFooterProgressSafe,
  ])

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimatingRef.current) return
    gestureLockedRef.current = false
    if (activeIndex === lastSlideIndex) {
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
      if (activeIndex === 0) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex - 1)
    }
  }, [activeIndex, closeFooter, isFooterOpen, lastSlideIndex, openFooter, scrollToIndex])

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, handleWheel])

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

  useEffect(() => {
    return () => {
      stopAnimationTimer()
      stopGestureTimer()
      stopFinalizeTimer()
    }
  }, [stopAnimationTimer, stopFinalizeTimer, stopGestureTimer])

  useEffect(() => {
    const links: HTMLLinkElement[] = []
    
    videoSections.forEach((section, idx) => {
      const isHighPriority = idx < 2
      
      const webmLink = document.createElement('link')
      webmLink.rel = 'preload'
      webmLink.as = 'video'
      webmLink.href = section.videoSrc
      webmLink.type = 'video/webm'
      webmLink.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(webmLink)
      links.push(webmLink)
      
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
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [])

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

    if (checkFirstVideoReady()) return

    const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
    if (!firstVideo) return

    firstVideo.addEventListener('loadedmetadata', () => {}, { once: true })
    firstVideo.addEventListener('canplay', () => {}, { once: true })

    return () => {
      firstVideo.removeEventListener('loadedmetadata', () => {})
      firstVideo.removeEventListener('canplay', () => {})
    }
  }, [])

  useEffect(() => {
    tpLog('TP0', 'home mount marker', {
      v: 'trackpad-v6-caption-fix',
      path: location.pathname,
      hash: location.hash || '',
    })
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
  }, [tpLog, location.pathname, location.hash])

  useEffect(() => {
    tpLog('CAP1', 'gesture/direction state', {
      activeIndex,
      incomingIndex,
      direction: direction || 'idle',
      isGesturing,
      gestureProgress: Math.round(gestureProgress * 1000) / 1000,
    })
  }, [activeIndex, direction, incomingIndex, isGesturing, gestureProgress, tpLog])

  useEffect(() => {
    if (!location.hash) return
    const hash = location.hash.replace('#', '')
    const targetIndex = videoSections.findIndex((section) => section.id === hash)
    if (targetIndex >= 0) {
      scrollToIndex(targetIndex)
    }
  }, [location.hash, scrollToIndex])

  useEffect(() => {
    const isActive = footerProgress > 0.02
    if (isActive) document.body.classList.add('footer-drawer-active')
    else document.body.classList.remove('footer-drawer-active')
    return () => {
      document.body.classList.remove('footer-drawer-active')
    }
  }, [footerProgress])

  useEffect(() => {
    if (activeIndex === lastSlideIndex) return
    lastSlideArrivedAtRef.current = 0
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
  }, [activeIndex, closeFooter, isFooterOpen, lastSlideIndex])

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
      <div
        ref={videoWrapperRef}
        className={styles.videoSectionsWrapper}
        data-direction={direction || 'idle'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--gesture-progress' as string]: String(gestureProgress) }}
      >
        {videoSections.map((section, index) => {
          const isNext = visibleNextIndex === index
          const isPrev = visiblePrevIndex === index
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
