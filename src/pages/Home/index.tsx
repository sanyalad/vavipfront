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
// When progress crosses this value we auto-commit to the next/prev section
// Reduced to 0.25 (25%) for easier slow scrolling - requires less scroll to flip page
const SNAP_THRESHOLD = 0.25
// If user stops the gesture before threshold, snap back after a short idle.
// For a regular mouse wheel, ticks can have noticeable gaps, so keep this relatively high.
const WHEEL_GESTURE_IDLE_RESET_MS = 520
// Trackpads emit a stream of wheel deltas; treat a short pause as "release".
// CRITICAL FIX: reduce from 140ms to 50ms for much faster finalization on slow scrolls
const TRACKPAD_GESTURE_IDLE_FINALIZE_MS = 50
// Heuristic: on macOS touchpads the *first* wheel event after a pause can be moderately large (e.g. 64),
// which must still be treated as trackpad to avoid "one swipe = one full section" misclassification.
// Keep this below typical mouse wheel ticks (~100/120) so mouse still snaps on one tick.
const TRACKPAD_DELTA_CUTOFF = 85
// Trackpad vs mouse: treat a burst of wheel events as trackpad-like even if deltas are large.
// This prevents "one tick = one full section" on touchpads and avoids skipping on fast scroll.
const TRACKPAD_STREAM_CUTOFF_MS = 180
// Trackpads can emit tiny deltas (1..5px). Don't start a gesture on a single tiny delta,
// but DO allow slow gestures by accumulating until we cross a small threshold.
const TRACKPAD_START_DELTA_PX = 6
const TRACKPAD_START_ACCUM_WINDOW_MS = 120
// Mouse wheels should advance slower for more visible animation (more "ticks" to cross the threshold)
// Increased from 320 to 600 to make mouse wheel animation more noticeable and smooth
const MOUSE_WHEEL_RANGE = 600

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)

  const videoWrapperRef = useRef<HTMLDivElement | null>(null)
  const footerDrawerRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)
  const touchStartTargetRef = useRef<HTMLElement | null>(null)
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
  const trackpadIgnoredCountRef = useRef(0)
  const trackpadStartSumRef = useRef(0)
  const trackpadStartSumTsRef = useRef(0)
  const trackpadCommitLockRef = useRef(false)
  const isCommittingRef = useRef(false)
  const trackpadUnlockTimerRef = useRef<number | null>(null)
  // After a commit, absorb inertial tail for a short window (prevents instant re-gesture on some touchpads)
  const postCommitIgnoreUntilRef = useRef(0)
  // Track last wheel event time after postCommitIgnoreUntil expires to detect continuing inertia
  const lastWheelAfterExpiryRef = useRef(0)
  const inertiaEventCountRef = useRef(0)
  // Safety net: never let commit lock stick forever if the wheel stream never goes idle on a device
  const trackpadCommitLockExpiresAtRef = useRef(0)
  const lastSlideArrivedAtRef = useRef(0)
  const activeIndexRef = useRef(0)
  // Throttle progress updates to 60fps
  const lastProgressUpdateTsRef = useRef(0)
  const lastProgressValueRef = useRef(0)
  // Velocity detection for fast swipes
  const velocityDeltasRef = useRef<{ delta: number; ts: number }[]>([])

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

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

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

  const stopTrackpadUnlockTimer = useCallback(() => {
    if (trackpadUnlockTimerRef.current) {
      window.clearTimeout(trackpadUnlockTimerRef.current)
      trackpadUnlockTimerRef.current = null
    }
  }, [])

  const scheduleTrackpadUnlock = useCallback(() => {
    stopTrackpadUnlockTimer()

    const check = () => {
      const now = performance.now()
      const last = lastWheelTsRef.current || 0
      const dt = now - last
      
      // CRITICAL: Also check if postCommitIgnoreUntil has expired
      const postCommitIgnoreUntil = postCommitIgnoreUntilRef.current || 0
      const postCommitExpired = now >= postCommitIgnoreUntil

      if (dt > TRACKPAD_STREAM_CUTOFF_MS && postCommitExpired) {
        trackpadCommitLockRef.current = false
        trackpadUnlockTimerRef.current = null
        return
      }

      const waitMs = Math.max(10, Math.ceil(TRACKPAD_STREAM_CUTOFF_MS - dt + 10))
      trackpadUnlockTimerRef.current = window.setTimeout(check, waitMs)
    }

    trackpadUnlockTimerRef.current = window.setTimeout(check, TRACKPAD_STREAM_CUTOFF_MS + 10)
  }, [stopTrackpadUnlockTimer])

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

  // PERF: Throttled version for trackpad - limits updates to 60fps and skips small changes
  const publishGestureProgressThrottled = useCallback(() => {
    const now = performance.now()
    const lastTs = lastProgressUpdateTsRef.current
    const lastValue = lastProgressValueRef.current
    const currentValue = gestureProgressRef.current
    
    // Throttle to ~240fps (4.17ms between updates) for smoother, more responsive trackpad scrolling
    // Reduced from 8ms to 4ms to prevent lag accumulation and provide smoother updates
    const timeSinceLastUpdate = now - lastTs
    if (timeSinceLastUpdate < 4) {
      return
    }
    
    // Skip if change is too small (< 0.001) for smoother, more responsive updates on slow scrolls
    // Reduced from 0.002 to 0.001 to allow more frequent updates during slow scrolling
    const delta = Math.abs(currentValue - lastValue)
    if (delta < 0.001 && currentValue > 0 && currentValue < 1) {
      return
    }
    
    lastProgressUpdateTsRef.current = now
    lastProgressValueRef.current = currentValue
    setGestureProgress(currentValue)
  }, [])


  const resetGesture = useCallback(() => {
    stopGestureTimer()
    stopFinalizeTimer()
    stopGestureRaf()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    gestureProgressRef.current = 0
    setGestureProgress(0)
    // CRITICAL: Only reset incomingIndex if not animating (to prevent clearing during animation)
    // CRITICAL: Also check isCommittingRef to prevent clearing during mouse wheel animation
    if (!isAnimatingRef.current && !isCommittingRef.current) {
      setIncomingIndex(null)
      setDirection(null)
    }
    setIsGesturing(false)
  }, [stopFinalizeTimer, stopGestureRaf, stopGestureTimer])

  const setFooterProgressSafe = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next))
    footerProgressRef.current = v
    setFooterProgress(v)
  }, [activeIndex, lastSlideIndex])

  const openFooter = useCallback(() => {
    // Hard safety: never open footer unless we are truly on the last slide.
    if (activeIndexRef.current !== lastSlideIndex) {
      return
    }
    // Prevent a single trackpad wheel stream from cascading into more commits / footer progress.
    trackpadCommitLockRef.current = true
    scheduleTrackpadUnlock()
    setIsFooterOpen(true)
    setFooterProgressSafe(1)
    // Reset scroll position immediately when opening footer
    if (footerDrawerRef.current) {
      footerDrawerRef.current.scrollTop = 0
    }
    // Also ensure scroll is reset on next frame
    requestAnimationFrame(() => {
      footerDrawerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [activeIndex, isFooterOpen, lastSlideIndex, scheduleTrackpadUnlock, setFooterProgressSafe])

  const closeFooter = useCallback(() => {
    // CRITICAL: Lock commit to prevent page skipping when closing footer
    trackpadCommitLockRef.current = true
    scheduleTrackpadUnlock()
    isCommittingRef.current = true
    setIsFooterOpen(false)
    setFooterProgressSafe(0)
    // CRITICAL: Reset gesture state to prevent any pending gestures from firing
    resetGesture()
    // CRITICAL: Absorb inertia after closing footer to prevent immediate section scroll
    // Reduced to 350ms for better responsiveness while still preventing inertia
    postCommitIgnoreUntilRef.current = performance.now() + 350
    // NOTE: Do NOT unlock trackpadCommitLockRef here.
    // It must stay locked until the wheel stream goes idle (wheelDt > TRACKPAD_STREAM_CUTOFF_MS),
    // otherwise trackpad inertia can immediately start a new gesture on the next slide.
    setTimeout(() => {
      isCommittingRef.current = false
    }, 200)
  }, [resetGesture, scheduleTrackpadUnlock, setFooterProgressSafe])

  const scrollToIndex = useCallback((nextIndex: number) => {
    // CRITICAL: Block if already animating (but allow if just committing - that's expected when called from finalizeGesture)
    if (isAnimatingRef.current) {
      return
    }
    
    // If footer overlay is visible/open, close it before navigating sections
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
    const safeIndex = clampIndex(nextIndex)
    
    // CRITICAL: Block if already at target index
    if (safeIndex === activeIndex) {
      return
    }

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

    // CRITICAL: Set locks IMMEDIATELY before any state updates
    isCommittingRef.current = true
    isAnimatingRef.current = true
    trackpadCommitLockRef.current = true
    
    stopAnimationTimer()
    stopGestureTimer()
    stopFinalizeTimer()
    
    // CRITICAL: Set animation states BEFORE resetGesture to prevent them from being cleared
    // This ensures the animation is visible for mouse wheel
    setFromIndex(activeIndex)
    setIncomingIndex(safeIndex)
    setDirection(nextDirection)
    setIsAnimating(true)
    
    // Make sure we exit gesture mode before the commit animation
    setIsGesturing(false)
    // CRITICAL: Reset gesture progress smoothly after animation starts
    // Use requestAnimationFrame to ensure smooth transition without visual jump
    // This prevents "jump" when releasing fingers during slow scroll
    requestAnimationFrame(() => {
      gestureProgressRef.current = 0
      setGestureProgress(0)
    })
    // Reset other gesture state immediately
    stopGestureTimer()
    stopFinalizeTimer()
    stopGestureRaf()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    
    // CRITICAL: Update activeIndex immediately for caption appearance
    // This ensures captions appear quickly and video sections are visible
    setActiveIndex(safeIndex)
    
    // Mark "arrival" immediately for last slide to allow footer interactions as soon as animation ends.
    lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
    
    // Timeout should match CSS animation duration (0.3s = 300ms) + small buffer
    const timeout = prefersReducedMotion.current ? 100 : 320
    animationTimerRef.current = window.setTimeout(() => {
      // CRITICAL: Clear incomingIndex and direction BEFORE unlocking commit locks
      // This prevents new gestures from starting with stale state
      setIncomingIndex(null)
      setDirection(null)
      setIsAnimating(false)
      // CRITICAL: Unlock commit locks only AFTER animation completes and state is cleared
      // CRITICAL: Reset isCommittingRef AFTER state is cleared to prevent race conditions
      // CRITICAL: isAnimatingRef will be reset AFTER postCommitIgnoreUntil is set (see below)
      isCommittingRef.current = false
      // CRITICAL: Extend postCommitIgnoreUntil to absorb trackpad inertia after animation completes
      // This prevents skipping sections when scrolling up/down due to trackpad inertia
      // Reduced to 350ms for better responsiveness while still preventing fast scroll skipping
      const now = performance.now()
      const extendedIgnoreUntil = now + 350 // 350ms to prevent skipping on fast scrolls while maintaining responsiveness
      postCommitIgnoreUntilRef.current = extendedIgnoreUntil
      // CRITICAL: Keep isAnimatingRef true until postCommitIgnoreUntil is set
      // This prevents race conditions where new gestures start before postCommitIgnoreUntil is set
      // Reset isAnimatingRef AFTER postCommitIgnoreUntil is set
      isAnimatingRef.current = false
      // CRITICAL: Keep trackpadCommitLock active until postCommitIgnoreUntil expires
      // This prevents false gestures from inertia after animation completes
      // Only clear if postCommitIgnoreUntil has expired (handled by scheduleTrackpadUnlock)
      // Don't clear here - let scheduleTrackpadUnlock handle it based on wheel stream idle time
      // Mark when we *actually* arrived at the last slide.
      lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
      animationTimerRef.current = null
    }, timeout)
  }, [activeIndex, clampIndex, closeFooter, incomingIndex, isFooterOpen, lastSlideIndex, resetGesture, stopAnimationTimer, stopFinalizeTimer, stopGestureTimer])

  const finalizeGesture = useCallback(() => {
    const progress = gestureProgressRef.current
    const dir = gestureDirectionRef.current

    // CRITICAL: Block if already committing or animation in progress
    if (isCommittingRef.current || isAnimatingRef.current) {
      return
    }
    // CRITICAL: Block if trackpad commit lock is active (prevents double-commit on fast swipes)
    // CRITICAL: Allow commit if progress is high enough (>= 0.5) even if trackpadCommitLock is active
    // Reduced from 0.7 to 0.5 for better responsiveness - allows commit at 50% progress
    const shouldAllowCommit = progress >= 0.5 || !trackpadCommitLockRef.current
    if (trackpadCommitLockRef.current && !shouldAllowCommit) {
      return
    }
    if (!dir) {
      resetGesture()
      return
    }
    
    if (progress >= SNAP_THRESHOLD) {
      // On the last slide, scrolling "next" opens footer overlay instead of native scroll below.
      if (dir === 'next' && activeIndex === lastSlideIndex) {
        const canOpenFooter = !isAnimatingRef.current && lastSlideArrivedAtRef.current > 0
        resetGesture()
        
        if (canOpenFooter) openFooter()
        return
      }
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      
      // CRITICAL: Double-check that we're not already animating to this index
      if (isAnimatingRef.current && incomingIndex === nextIndex) {
        resetGesture()
        return
      }
      
    // CRITICAL: Set both locks BEFORE resetting gesture
    isCommittingRef.current = true
    trackpadCommitLockRef.current = true
    // Absorb inertia to prevent double scroll and false gestures after fast swipes
    // Reduced to 350ms for better responsiveness while still preventing inertia
    postCommitIgnoreUntilRef.current = performance.now() + 350
    // Safety: even if a device keeps emitting wheel events continuously, do not lock forever.
    trackpadCommitLockExpiresAtRef.current = performance.now() + 2000
    scheduleTrackpadUnlock()
    // CRITICAL: Don't reset gesture here - let scrollToIndex handle it
    // This prevents incomingIndex from being cleared before scrollToIndex sets it
    stopFinalizeTimer()
    stopGestureTimer()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    // CRITICAL: Don't reset progress immediately - let scrollToIndex handle it smoothly
    // This prevents visual "jump" when releasing fingers during slow scroll
    // Progress will be reset in scrollToIndex after animation starts
    setIsGesturing(false)
      
      scrollToIndex(nextIndex)
      return
    }

    resetGesture()
  }, [activeIndex, clampIndex, incomingIndex, lastSlideIndex, openFooter, resetGesture, scheduleTrackpadUnlock, scrollToIndex])

  const scheduleFinalize = useCallback((delayMs: number) => {
    stopFinalizeTimer()
    
    // CRITICAL: Don't schedule if already committing or animating
    if (isCommittingRef.current || isAnimatingRef.current) {
      return
    }

    finalizeTimerRef.current = window.setTimeout(() => {
      finalizeTimerRef.current = null
      
      // CRITICAL: Double-check before firing - might have been committed already
      // CRITICAL: Allow commit if progress is high enough (>= 0.3) even if trackpadCommitLock is active
      // This ensures slow scrolls can commit even with lock active
      const progress = gestureProgressRef.current
      const shouldAllowCommit = progress >= SNAP_THRESHOLD || !trackpadCommitLockRef.current
      if (isCommittingRef.current || isAnimatingRef.current || (trackpadCommitLockRef.current && !shouldAllowCommit)) {
        return
      }

      finalizeGesture()
    }, delayMs)
  }, [activeIndex, finalizeGesture, incomingIndex, stopFinalizeTimer])

  const handleWheel = useCallback((event: WheelEvent) => {
    if (prefersReducedMotion.current) {
      
      return
    }

    // If header dropdown is open, let the dropdown scroll (do not hijack wheel for video sections).
    if (document.body.classList.contains('dropdown-scroll-lock')) {
      
      return
    }

    const wrapper = videoWrapperRef.current
    if (!wrapper) {
      
      return
    }

    // Only hijack scroll when the hero stack actually fills the viewport.
    // This prevents wheel events over the footer from still switching slides.
    const wrapperRect = wrapper.getBoundingClientRect()
    // IMPORTANT: allow a little drift (trackpads can emit tiny deltas that otherwise push the page by 1-3px)
    // If we require perfect alignment, the first tiny delta can break hijacking and make trackpad feel "dead".
    const wrapperTopAligned = Math.abs(wrapperRect.top) <= 24
    const wrapperFillsViewport = wrapperRect.bottom >= window.innerHeight * 0.92
    const shouldHandle = wrapperTopAligned && wrapperFillsViewport
    if (!shouldHandle) {
      
      return
    }

    let deltaY = event.deltaY || 0
    // Normalize delta across devices
    if (event.deltaMode === 1) deltaY *= 16 // lines -> px-ish
    if (event.deltaMode === 2) deltaY *= window.innerHeight // pages -> px-ish
    const now = performance.now()
    const wheelDt = now - (lastWheelTsRef.current || 0)
    lastWheelTsRef.current = now
    const isLikelyTrackpad =
      event.deltaMode === 0 && (Math.abs(deltaY) < TRACKPAD_DELTA_CUTOFF || wheelDt < TRACKPAD_STREAM_CUTOFF_MS)
    const absDelta = Math.abs(deltaY)
    // For mouse wheels we can ignore sub-threshold noise, but for trackpads we must preventDefault
    // even for tiny deltas; otherwise the page drifts a few pixels and we stop hijacking.
    if (!isLikelyTrackpad && absDelta < WHEEL_THRESHOLD) return
    // macOS trackpads can sometimes spike; clamping avoids accidental "skip" / jerks.
    const absDeltaClamped = isLikelyTrackpad ? Math.min(absDelta, 120) : absDelta

    // IMPORTANT: keep the hero stack pinned (avoid native scroll drift) for trackpads,
    // even when we end up accumulating tiny deltas.
    if (isLikelyTrackpad) {
      // If wheel is happening inside the footer drawer, allow native scroll there.
      const targetNode = event.target as Node | null
      const isInsideFooter =
        isFooterOpen && !!footerDrawerRef.current && !!targetNode && footerDrawerRef.current.contains(targetNode)
      if (!isInsideFooter) {
        event.preventDefault()
        // If we drifted slightly, snap back to top so wrapper stays aligned.
        if (Math.abs(wrapperRect.top) > 2 && Math.abs(wrapperRect.top) <= 24) {
          window.scrollTo(0, 0)
        }
      }
    }

    // After commit: absorb inertial tail (prevents the "stuck after 1–2 scrolls" on some touchpads)
    // CRITICAL: This must be checked BEFORE trackpad commit lock check to properly absorb inertia
    // CRITICAL: But allow new gestures to start if we're not actually animating/committing
    // This fixes the bug where section peeks at 10% after footer close
    if (isLikelyTrackpad) {
      const targetNode = event.target as Node | null
      const isInsideFooter =
        isFooterOpen && !!footerDrawerRef.current && !!targetNode && footerDrawerRef.current.contains(targetNode)
      const postCommitIgnoreUntil = postCommitIgnoreUntilRef.current || 0
      // CRITICAL: Always block gestures if postCommitIgnoreUntil hasn't expired
      // This prevents partial scrolling (inertia) after section activation
      // As soon as a section is activated, nothing should happen with scrolling
      if (!isInsideFooter && now < postCommitIgnoreUntil) {
        event.preventDefault()
        return
      }
      
      // CRITICAL: Detect and block inertia after postCommitIgnoreUntil expires
      // Inertia is characterized by: small deltas (< 20px), no active gesture, and events within 500ms after expiration
      // Extended window to catch longer inertia tails from trackpads
      if (!isInsideFooter && postCommitIgnoreUntil > 0 && now >= postCommitIgnoreUntil) {
        const timeSinceExpiry = now - postCommitIgnoreUntil
        const isSmallDelta = absDelta < 20
        const hasNoActiveGesture = !gestureDirectionRef.current && gestureProgressRef.current === 0
        const isWithinInertiaWindow = timeSinceExpiry < 500
        
        // Reset inertia counter if enough time passed since last wheel event (user stopped)
        const timeSinceLastWheel = now - lastWheelAfterExpiryRef.current
        if (timeSinceLastWheel > 300) {
          inertiaEventCountRef.current = 0
        }
        
        // If this looks like inertia (small deltas, no gesture, within 500ms of expiry), block it
        if (isSmallDelta && hasNoActiveGesture && isWithinInertiaWindow) {
          lastWheelAfterExpiryRef.current = now
          inertiaEventCountRef.current++
          event.preventDefault()
          return
        }
        
        // CRITICAL: Even after 500ms, if we're still getting small deltas in a stream, it's likely inertia
        // Block if: small delta, no gesture, and we've seen multiple small events recently (inertia stream)
        if (isSmallDelta && hasNoActiveGesture && inertiaEventCountRef.current > 5 && timeSinceLastWheel < 100) {
          lastWheelAfterExpiryRef.current = now
          event.preventDefault()
          return
        }
        
        // Reset counter if we see a large delta (likely intentional gesture)
        if (absDelta >= 20) {
          inertiaEventCountRef.current = 0
          lastWheelAfterExpiryRef.current = now
        }
      }
    }

    // Trackpad commit lock: one wheel stream -> max one commit. Unlock after the stream goes idle.
    // CRITICAL: Only block if we're actually animating, not just during inertia window
    if (isLikelyTrackpad && trackpadCommitLockRef.current && isAnimatingRef.current) {
      // Safety net: if wheel stream never goes idle on a device, expire lock by time.
      if (performance.now() > (trackpadCommitLockExpiresAtRef.current || 0)) {
        trackpadCommitLockRef.current = false
        stopTrackpadUnlockTimer()
      } else {
      // Allow native scrolling inside footer even while commit lock is active
      const targetNode = event.target as Node | null
      if (isFooterOpen && footerDrawerRef.current && targetNode && footerDrawerRef.current.contains(targetNode)) {
        return
      }
      if (wheelDt > TRACKPAD_STREAM_CUTOFF_MS) {
        trackpadCommitLockRef.current = false
        stopTrackpadUnlockTimer()
      } else {
        return
      }
      }
    }

    // Don't start a gesture on a single tiny delta, but allow slow gestures to accumulate.
    // Also prevent native scroll while the hero stack is handling wheel.
    if (isLikelyTrackpad && !gestureDirectionRef.current && absDelta < TRACKPAD_START_DELTA_PX) {
      event.preventDefault()
      const lastTs = trackpadStartSumTsRef.current || 0
      if (!lastTs || (now - lastTs) > TRACKPAD_START_ACCUM_WINDOW_MS) {
        trackpadStartSumRef.current = 0
      }
      trackpadStartSumTsRef.current = now
      trackpadStartSumRef.current += absDelta

      if (trackpadStartSumRef.current < TRACKPAD_START_DELTA_PX) {
        return
      }

      // Threshold reached: allow gesture to start on this event.
      trackpadStartSumRef.current = 0
    } else {
      // reset counters once we accept meaningful deltas
      trackpadIgnoredCountRef.current = 0
      trackpadStartSumRef.current = 0
    }

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
      // Allow footer opening as soon as slide animation is done.
      // Trackpad commit lock already prevents inertial tail from triggering this immediately.
      const canOpenFooter = !isAnimatingRef.current && lastSlideArrivedAtRef.current > 0

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
        // Prevent opening while slide is still animating in.
        if (!canOpenFooter) return
        // Open footer immediately for both mouse and trackpad
        openFooter()
        return
      }
    }

    // CRITICAL: Hard lock - block ALL wheel events during animation
    // CRITICAL: This is the PRIMARY check - must block everything during animation/commit
    // CRITICAL: Also check postCommitIgnoreUntil to prevent immediate re-gestures after animation
    // CRITICAL: HARD FIX - block ALL gestures during post-commit ignore window to prevent skipping
    const postCommitIgnoreUntilCheck = postCommitIgnoreUntilRef.current || 0
    if (isAnimatingRef.current || isCommittingRef.current || now < postCommitIgnoreUntilCheck) {
      // CRITICAL: Allow native scrolling inside footer even during lock
      const targetNode = event.target as Node | null
      if (isFooterOpen && footerDrawerRef.current && targetNode && footerDrawerRef.current.contains(targetNode)) {
        return
      }
      event.preventDefault()
      return
    }

    // CRITICAL: Block if trackpad commit lock is active AND we're actually animating
    // But allow gesture to start if commit lock is just for inertia absorption
    // Allow commit if progress is high enough (>= 0.5) even during lock
    const currentProgress = gestureProgressRef.current
    const shouldAllowCommitDuringLock = currentProgress >= 0.5
    if (trackpadCommitLockRef.current && isAnimatingRef.current && !shouldAllowCommitDuringLock) {
      
      // Allow native scrolling inside footer even while commit lock is active
      const targetNode = event.target as Node | null
      if (isFooterOpen && footerDrawerRef.current && targetNode && footerDrawerRef.current.contains(targetNode)) {
        return
      }
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

    // Mouse wheel: переключаемся сразу с 1 тика (с анимацией).
    // Trackpad остаётся "follow until release".
    if (!isLikelyTrackpad) {
      // Block if already committing or animating
      if (isCommittingRef.current || isAnimatingRef.current) {
        return
      }
      
      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      
      // Block if already at target index
      if (nextIndex === activeIndex) {
        return
      }
      
      // Set locks before calling scrollToIndex
      postCommitIgnoreUntilRef.current = performance.now() + 350
      
      // scrollToIndex will set all necessary states for animation
      // Use requestAnimationFrame to ensure React has time to update DOM before animation starts
      requestAnimationFrame(() => {
        scrollToIndex(nextIndex)
      })
      return
    }

    // If direction changed, restart gesture
    // CRITICAL: Only restart if not already committing/animating
    if (gestureDirectionRef.current !== dir) {
      // Block if already committing or animating
      if (isCommittingRef.current || isAnimatingRef.current) {
        
        return
      }
      
      // CRITICAL: Block new gesture if we're still in the post-commit ignore window
      // This prevents inertia from creating false gestures after animation completes
      // CRITICAL: Use isAnimatingRef instead of incomingIndex because incomingIndex is reset asynchronously
      // CRITICAL: Also check if isCommittingRef is still active
      const postCommitIgnoreUntil = postCommitIgnoreUntilRef.current || 0
      const nowTime = performance.now()
      if (nowTime < postCommitIgnoreUntil || isCommittingRef.current || isAnimatingRef.current) {
        return
      }
      
      // CRITICAL: Block new gesture if we're still animating or committing
      // This prevents skipping sections and double activations
      if (isAnimatingRef.current || isCommittingRef.current) {
        
        return
      }
      
      // CRITICAL: Clear trackpadCommitLock if postCommitIgnoreUntil has expired
      // This allows new gestures to commit even if the lock is still active from previous animation
      if (trackpadCommitLockRef.current && nowTime >= postCommitIgnoreUntil) {
        trackpadCommitLockRef.current = false
        stopTrackpadUnlockTimer()
      }
      
      gestureDirectionRef.current = dir
      gestureProgressRef.current = 0
      setIsGesturing(true)
      setFromIndex(activeIndex)
      // CRITICAL: Don't set incomingIndex immediately - wait until gesture reaches minimum progress (5%)
      // This prevents showing the next section during very small gestures that might be cancelled
      // incomingIndex will be set when gestureProgress reaches 0.05 in the progress update logic
      setDirection(dir)
      setIsAnimating(false)
      setGestureProgress(0)
    }

    stopGestureTimer()
    stopFinalizeTimer()

    // PERF: reduce wheelRange for higher sensitivity and smoother slow scrolling
    // Smaller range = faster progress accumulation = easier to flip pages with slow scroll
    // Optimized for smooth, mobile-like scrolling experience with better sensitivity
    const wheelRange = isLikelyTrackpad
      ? Math.min(240, Math.max(80, window.innerHeight * 0.3))
      : MOUSE_WHEEL_RANGE
    const prevProgress = gestureProgressRef.current
    const nextProgress = Math.min(1, prevProgress + absDeltaClamped / wheelRange)
    gestureProgressRef.current = nextProgress
    
    // Set incomingIndex earlier (5%) for smoother, more responsive slow scrolling
    // This provides better visual feedback during slow gestures
    if (nextProgress >= 0.05 && !incomingIndex && gestureDirectionRef.current) {
      const nextTargetIndex = clampIndex(activeIndex + (gestureDirectionRef.current === 'next' ? 1 : -1))
      if (nextTargetIndex !== activeIndex) {
        setIncomingIndex(nextTargetIndex)
      }
    }
    
    // PERF: Calculate velocity for fast swipe detection (px/ms)
    // Keep last 5 deltas within 100ms window
    const velocityWindow = 100
    velocityDeltasRef.current.push({ delta: absDeltaClamped, ts: now })
    velocityDeltasRef.current = velocityDeltasRef.current.filter(
      (d) => now - d.ts < velocityWindow
    )
    const totalDelta = velocityDeltasRef.current.reduce((sum, d) => sum + d.delta, 0)
    const timeSpan = velocityDeltasRef.current.length > 1
      ? now - velocityDeltasRef.current[0].ts
      : 16 // assume 1 frame if single event
    const velocity = timeSpan > 0 ? totalDelta / timeSpan : 0
    
    // PERF: use throttled updates for trackpad to reduce re-renders, immediate for mouse
    if (isLikelyTrackpad) {
      publishGestureProgressThrottled()
    } else {
      publishGestureProgressImmediate()
    }

    // Trackpad: for FAST swipes (high velocity), commit immediately when threshold crossed
    // This prevents the "double scroll" feeling on quick gestures
    // CRITICAL: Only commit if progress >= SNAP_THRESHOLD to avoid premature commits
    const VELOCITY_FAST_THRESHOLD = 1.2 // px/ms - reduced for more responsive scrolling
    if (isLikelyTrackpad) {
      // CRITICAL: Fast swipe commit only if progress is already at threshold
      // This prevents premature commits that cause flickering
      // Use gestureProgressRef.current for accurate progress check
      const currentProgress = gestureProgressRef.current
      
      // Fast swipes: commit immediately at SNAP_THRESHOLD (30%)
      if (velocity >= VELOCITY_FAST_THRESHOLD && currentProgress >= SNAP_THRESHOLD) {
        // CRITICAL: Block if already committing or animating
        // CRITICAL: Allow commit if progress is high enough (>= 0.5) even if trackpadCommitLock is active
        // Reduced threshold from 0.7 to 0.5 for better responsiveness
        const shouldAllowCommit = currentProgress >= 0.5 || !trackpadCommitLockRef.current
        if (isCommittingRef.current || isAnimatingRef.current || !shouldAllowCommit) {
          return
        }

        // CRITICAL: Stop ALL timers BEFORE finalizeGesture
        // DO NOT set locks here - let finalizeGesture set them to avoid blocking itself
        stopFinalizeTimer()
        stopGestureTimer()
        // Immediate commit for fast swipes - finalizeGesture will set the locks
        finalizeGesture()
        return
      }
      
      // For slower gestures, wait for idle before committing
      // Further reduced delay for faster response on slow scrolls
      // Use shorter delay for better responsiveness, especially for slow downward scrolls
      // CRITICAL: If progress is at or near 100%, commit immediately instead of waiting
      if (currentProgress >= 0.95) {
        // Immediate commit for near-100% progress
        if (!isCommittingRef.current && !isAnimatingRef.current) {
          stopFinalizeTimer()
          stopGestureTimer()
          finalizeGesture()
          return
        }
      }
      
      // CRITICAL: Auto-commit at 40% progress for slow scrolls to complete animation smoothly
      // This provides better UX - animation completes automatically when user reaches 40%
      if (currentProgress >= 0.4 && velocity < VELOCITY_FAST_THRESHOLD) {
        // Auto-commit for slow scrolls at 40% - animation will complete smoothly
        if (!isCommittingRef.current && !isAnimatingRef.current) {
          stopFinalizeTimer()
          stopGestureTimer()
          finalizeGesture()
          return
        }
      }
      
      scheduleFinalize(TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
      return
    }

    // Mouse wheel: keep the older snappy behavior
    if (nextProgress >= SNAP_THRESHOLD) {
      // CRITICAL: Block if already committing or animating
      if (isCommittingRef.current || isAnimatingRef.current || trackpadCommitLockRef.current) {
        return
      }
      
      gestureLockedRef.current = true
      // Set locks before finalizeGesture
      isCommittingRef.current = true
      trackpadCommitLockRef.current = true
      postCommitIgnoreUntilRef.current = performance.now() + 350
      trackpadCommitLockExpiresAtRef.current = performance.now() + 1200
      scheduleTrackpadUnlock()
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
    publishGestureProgressThrottled,
    resetGesture,
    scheduleFinalize,
    scheduleGestureReset,
    scrollToIndex,
    setFooterProgressSafe,
    stopFinalizeTimer,
    stopGestureTimer,
    stopTrackpadUnlockTimer,
  ])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    gestureLockedRef.current = false
    touchStartY.current = event.touches[0]?.clientY ?? 0
    // CRITICAL: Store the target element where touch started
    touchStartTargetRef.current = event.target as HTMLElement
    resetGesture()
  }, [prefersReducedMotion, resetGesture])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    if (gestureLockedRef.current) return

    // CRITICAL: Check if touch is inside footer drawer - allow native scroll
    const target = event.target as HTMLElement
    if (footerDrawerRef.current && target && isFooterOpen) {
      // Check if target or any parent is inside footer drawer
      let currentElement: HTMLElement | null = target
      let isInsideFooter = false
      
      while (currentElement && currentElement !== document.body) {
        if (footerDrawerRef.current.contains(currentElement)) {
          isInsideFooter = true
          break
        }
        currentElement = currentElement.parentElement
      }
      
      if (isInsideFooter) {
        // Allow native scroll inside footer - don't preventDefault
        return
      }
    }

    const y = event.touches[0]?.clientY ?? 0
    const diff = touchStartY.current - y
    if (Math.abs(diff) < 6) return

    // CRITICAL: Stop any pending gesture reset timers when user is actively touching
    stopGestureTimer()

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
        // CRITICAL: Check if touch started inside footer - if so, allow native scroll
        const touchStartTarget = touchStartTargetRef.current
        const isTouchStartInFooter = footerDrawerRef.current && touchStartTarget &&
          (footerDrawerRef.current.contains(touchStartTarget) || 
           (touchStartTarget.closest && footerDrawerRef.current.contains(touchStartTarget.closest('[class*="footer"]') as HTMLElement)))
        
        if (isTouchStartInFooter) {
          // Allow native scroll inside footer - don't preventDefault
          return
        }
        
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
    // CRITICAL: Set incomingIndex only when gesture reaches minimum progress (5%)
    // This prevents showing the next section during very small gestures that might be cancelled
    if (nextProgress >= 0.05 && !incomingIndex) {
      const nextTargetIndex = clampIndex(activeIndex + (gestureDirectionRef.current === 'next' ? 1 : -1))
      if (nextTargetIndex !== activeIndex) {
        setIncomingIndex(nextTargetIndex)
        
      }
    }
    // Touch should feel "1:1" — update immediately (no RAF batching).
    publishGestureProgressImmediate()
  }, [
    activeIndex,
    clampIndex,
    isFooterOpen,
    lastSlideIndex,
    publishGestureProgressImmediate,
    resetGesture,
    setFooterProgressSafe,
  ])

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimatingRef.current) return
    // CRITICAL: Stop any pending timers when touch ends
    stopGestureTimer()
    stopFinalizeTimer()
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
      resetGesture()
      return
    }
    // CRITICAL: Only finalize if there's actual gesture progress
    if (gestureProgressRef.current > 0 && gestureDirectionRef.current) {
      finalizeGesture()
    } else {
      // If no progress, just reset
      resetGesture()
    }
  }, [activeIndex, closeFooter, finalizeGesture, isFooterOpen, lastSlideIndex, openFooter, resetGesture, stopFinalizeTimer, stopGestureTimer])

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
      stopTrackpadUnlockTimer()
    }
  }, [stopAnimationTimer, stopFinalizeTimer, stopGestureTimer, stopTrackpadUnlockTimer])

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

  // Во время анимации:
  // При скролле вниз: fromIndex -> prev (остается), activeIndex -> next (выезжает снизу)
  // При скролле вверх: activeIndex -> prev (выезжает сверху), fromIndex -> next (уходит вниз)
  // CRITICAL: Show next/prev only when there's actual direction and incomingIndex is set
  // During gesture, incomingIndex is set, so we show it. During animation, isAnimating is true.
  const visibleNextIndex = useMemo(() => {
    if (!direction) return null
    // Only show if we have a valid incomingIndex or we're animating
    const nextIdx = direction === 'next' ? incomingIndex : (direction === 'prev' ? fromIndex : null)
    return nextIdx !== null ? nextIdx : null
  }, [direction, incomingIndex, fromIndex])
  
  const visiblePrevIndex = useMemo(() => {
    if (!direction) return null
    // Only show if we have a valid fromIndex or incomingIndex
    const prevIdx = direction === 'next' ? fromIndex : (direction === 'prev' ? incomingIndex : null)
    return prevIdx !== null ? prevIdx : null
  }, [direction, fromIndex, incomingIndex])

  // Caption/gesture diagnostics: on trackpad gestures captions are forced hidden while data-gesture=true.
  // We log only when gesture/direction toggles (not on every progress update).
  useEffect(() => {
    
  }, [activeIndex, direction, incomingIndex, isGesturing, gestureProgress])

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
          // CRITICAL FIX: During animation, the next section should NOT be active
          // so it gets data-state="next" instead of "active" to trigger the CSS animation.
          // After animation completes, it will become active.
          // For prev direction, the incoming section should also not be active during animation.
          const isActive = index === activeIndex && !isPrev && !(isAnimating && (isNext || (direction === 'prev' && index === incomingIndex)))
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

    </motion.div>
  )
}
