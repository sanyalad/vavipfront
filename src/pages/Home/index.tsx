import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import VideoSection from '@/components/animations/VideoSection'
import Footer from '@/components/layout/Footer'
import { useGesturePhysics, calculateWheelRange } from '@/hooks/useGesturePhysics'
import type { GestureState, GestureDirection } from '@/utils/gesturePhysics'
import styles from './Home.module.css'

// ===== DEBUG MODE =====
// Enable via URL ?deckDebug=1 or localStorage.setItem('deckDebug', '1')
const getDebugMode = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('deckDebug') === '1') return true
    if (localStorage.getItem('deckDebug') === '1') return true
  } catch {
    // localStorage might be blocked
  }
  return false
}

// Debug logging with structured data
interface DeckDebugEvent {
  type: 'wheel_start' | 'wheel_progress' | 'threshold_cross' | 'release_finalize' | 
        'scrollToIndex_begin' | 'scrollToIndex_end' | 'gesture_reset' | 'mode_change' |
        'commit_lock' | 'invariant_violation'
  timestamp: number
  data: Record<string, unknown>
}

const debugLog = (event: DeckDebugEvent) => {
  if (!getDebugMode()) return
  const prefix = `[DeckDebug ${event.timestamp.toFixed(1)}ms]`
  if (event.type === 'invariant_violation') {
    console.error(prefix, event.type, event.data)
  } else {
    console.log(prefix, event.type, event.data)
  }
}

// Check deck state invariants
const checkDeckInvariants = (state: {
  activeIndex: number
  fromIndex: number
  incomingIndex: number | null
  direction: 'next' | 'prev' | null
  isAnimating: boolean
  isGesturing: boolean
  gestureProgress: number
  lastSlideIndex: number
}) => {
  if (!getDebugMode()) return
  
  const violations: string[] = []
  
  // If direction is set, incomingIndex should be set (except during brief transitions)
  if (state.direction && state.incomingIndex === null && !state.isGesturing) {
    violations.push(`direction=${state.direction} but incomingIndex=null (not gesturing)`)
  }
  
  // incomingIndex should be within bounds
  if (state.incomingIndex !== null && (state.incomingIndex < 0 || state.incomingIndex > state.lastSlideIndex)) {
    violations.push(`incomingIndex=${state.incomingIndex} out of bounds [0..${state.lastSlideIndex}]`)
  }
  
  // activeIndex should be within bounds
  if (state.activeIndex < 0 || state.activeIndex > state.lastSlideIndex) {
    violations.push(`activeIndex=${state.activeIndex} out of bounds [0..${state.lastSlideIndex}]`)
  }
  
  // gestureProgress should be in reasonable range
  if (state.gestureProgress < -0.5 || state.gestureProgress > 1.5) {
    violations.push(`gestureProgress=${state.gestureProgress} outside reasonable range`)
  }
  
  // If animating, direction should be set
  if (state.isAnimating && !state.direction) {
    violations.push(`isAnimating=true but direction=null`)
  }
  
  if (violations.length > 0) {
    debugLog({
      type: 'invariant_violation',
      timestamp: performance.now(),
      data: { violations, state }
    })
  }
}

// Debug overlay styles (inline to avoid CSS module)
const debugOverlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 10,
  right: 10,
  zIndex: 99999,
  background: 'rgba(0, 0, 0, 0.85)',
  color: '#0f0',
  fontFamily: 'monospace',
  fontSize: '11px',
  padding: '8px 12px',
  borderRadius: '4px',
  pointerEvents: 'none',
  maxWidth: '320px',
  lineHeight: 1.4,
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(0, 255, 0, 0.3)',
}

interface DebugOverlayProps {
  activeIndex: number
  fromIndex: number
  incomingIndex: number | null
  direction: 'next' | 'prev' | null
  isAnimating: boolean
  isGesturing: boolean
  gestureProgress: number
  footerProgress: number
  isFooterOpen: boolean
  trackpadCommitLock: boolean
  postCommitIgnoreUntil: number
  lastWheelDt: number
  gestureSource: 'trackpad' | 'touch' | null
}

const DebugOverlay: React.FC<DebugOverlayProps> = (props) => {
  const now = performance.now()
  const postCommitRemaining = Math.max(0, props.postCommitIgnoreUntil - now)
  
  return (
    <div style={debugOverlayStyles}>
      <div style={{ borderBottom: '1px solid #0f04', paddingBottom: 4, marginBottom: 4 }}>
        <strong>DECK DEBUG</strong>
      </div>
      <div>activeIdx: <span style={{ color: '#ff0' }}>{props.activeIndex}</span></div>
      <div>fromIdx: {props.fromIndex}</div>
      <div>incomingIdx: <span style={{ color: props.incomingIndex !== null ? '#0ff' : '#666' }}>
        {props.incomingIndex ?? 'null'}
      </span></div>
      <div>direction: <span style={{ color: props.direction ? '#f0f' : '#666' }}>
        {props.direction ?? 'null'}
      </span></div>
      <div style={{ marginTop: 4, borderTop: '1px solid #0f04', paddingTop: 4 }}>
        <div>isAnimating: <span style={{ color: props.isAnimating ? '#f00' : '#0f0' }}>
          {String(props.isAnimating)}
        </span></div>
        <div>isGesturing: <span style={{ color: props.isGesturing ? '#ff0' : '#0f0' }}>
          {String(props.isGesturing)}
        </span></div>
        <div>gestureProgress: {props.gestureProgress.toFixed(3)}</div>
      </div>
      <div style={{ marginTop: 4, borderTop: '1px solid #0f04', paddingTop: 4 }}>
        <div>commitLock: <span style={{ color: props.trackpadCommitLock ? '#f00' : '#0f0' }}>
          {String(props.trackpadCommitLock)}
        </span></div>
        <div>postCommitIgnore: {postCommitRemaining.toFixed(0)}ms</div>
        <div>lastWheelDt: {props.lastWheelDt.toFixed(0)}ms</div>
        <div>source: {props.gestureSource ?? 'none'}</div>
      </div>
      <div style={{ marginTop: 4, borderTop: '1px solid #0f04', paddingTop: 4 }}>
        <div>footerOpen: {String(props.isFooterOpen)}</div>
        <div>footerProgress: {props.footerProgress.toFixed(3)}</div>
      </div>
    </div>
  )
}

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
// Threshold to COMMIT a gesture (must scroll this far to flip page)
// Increased from 0.25 to 0.35 for more stability on trackpads
const SNAP_THRESHOLD_COMMIT = 0.35
// Threshold to CANCEL a commit-in-progress (hysteresis)
// Once past COMMIT threshold, must drop below this to cancel
// This prevents "flickering" near the threshold
const SNAP_THRESHOLD_CANCEL = 0.20
// Legacy alias for backwards compatibility
const SNAP_THRESHOLD = SNAP_THRESHOLD_COMMIT
// If user stops the gesture before threshold, snap back after a short idle.
// For a regular mouse wheel, ticks can have noticeable gaps, so keep this relatively high.
const WHEEL_GESTURE_IDLE_RESET_MS = 520
// Trackpads emit a stream of wheel deltas; treat a short pause as "release".
// Release detection for trackpads. Higher value reduces accidental "release" during micro-pauses.
// CRITICAL: Increased from 200ms to 400ms to prevent premature release while user is still scrolling
const TRACKPAD_GESTURE_IDLE_FINALIZE_MS = 400
// Heuristic: on macOS touchpads the *first* wheel event after a pause can be moderately large (e.g. 64),
// which must still be treated as trackpad to avoid "one swipe = one full section" misclassification.
// Keep this below typical mouse wheel ticks (~100/120) so mouse still snaps on one tick.
const TRACKPAD_DELTA_CUTOFF = 85
// Trackpad vs mouse: treat a burst of wheel events as trackpad-like even if deltas are large.
// This prevents "one tick = one full section" on touchpads and avoids skipping on fast scroll.
const TRACKPAD_STREAM_CUTOFF_MS = 180
// Trackpads can emit tiny deltas (1..5px). Don't start a gesture on a single tiny delta,
// but DO allow slow gestures by accumulating until we cross a small threshold.
// Reduced for more sensitive gesture start
const TRACKPAD_START_DELTA_PX = 4
const TRACKPAD_START_ACCUM_WINDOW_MS = 120
// Duration to ignore wheel events after a commit (absorbs trackpad inertia)
// Too short: inertia causes immediate re-gesture or skipping
// Too long: feels unresponsive to intentional new gestures
const POST_COMMIT_IGNORE_MS = 400  // Increased from 350ms for more stable absorption
// Mouse wheel range is now in calculateWheelRange() from useGesturePhysics
// Trackpad range is also calculated dynamically
// Touch swipe range is now calculated by calculateWheelRange() from useGesturePhysics

// ===== PHYSICS ENGINE =====
// All momentum, friction, and spring physics are now handled by GesturePhysicsEngine
// See: frontend/src/utils/gesturePhysics.ts

// Legacy velocity tracking for footer gesture (until migrated to physics engine)
const VELOCITY_WINDOW_MS = 80
const MAX_VELOCITY_SAMPLES = 8

interface VelocitySample {
  progress: number
  ts: number
}

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(false)
  const debugWheelDtRef = useRef(0)
  
  // Initialize debug mode on mount
  useEffect(() => {
    setDebugMode(getDebugMode())
  }, [])

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
  // Throttling for physics.input() to prevent overload during fast scrolling
  const lastPhysicsInputTsRef = useRef(0)
  const accumulatedDeltaRef = useRef(0)
  const accumulatedDeltaDirRef = useRef<'next' | 'prev' | null>(null)
  const rafScheduledRef = useRef(false)
  // CRITICAL: Adaptive throttling - more aggressive for fast scroll, less for slow scroll
  // This prevents lag during fast scrolling while maintaining responsiveness for slow gestures
  const PHYSICS_INPUT_THROTTLE_MS = 8 // ~125fps max - increased for better performance during fast scroll
  // Enhanced velocity tracking for momentum scrolling (legacy, used by touch/footer)
  const velocitySamplesRef = useRef<VelocitySample[]>([])
  // Momentum animation state (legacy)
  const momentumRafRef = useRef<number | null>(null)
  const isMomentumActiveRef = useRef(false)
  // Touch velocity tracking
  const touchVelocitySamplesRef = useRef<{ y: number; ts: number }[]>([])
  // Track last gesture source to apply different "release" semantics.
  const lastGestureSourceRef = useRef<'trackpad' | 'touch' | null>(null)
  // Hysteresis tracking: once we cross COMMIT threshold, we've "entered" commit zone
  // Need to drop below CANCEL threshold to exit (prevents flickering at boundary)
  const hasEnteredCommitZoneRef = useRef(false)

  // ===== STATE MANAGEMENT =====
  // Use regular useState but with helper for atomic batch updates
  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [isGesturing, setIsGesturing] = useState(false)
  const [footerProgress, setFooterProgress] = useState(0) // 0..1
  const [isFooterOpen, setIsFooterOpen] = useState(false)
  
  // Derived mode for CSS targeting (computed, not stateful)
  const deckMode = useMemo(() => {
    if (isAnimating) {
      return direction === 'next' ? 'animating_next' : direction === 'prev' ? 'animating_prev' : 'idle'
    } else if (isGesturing) {
      return direction === 'next' ? 'gesturing_next' : direction === 'prev' ? 'gesturing_prev' : 'idle'
    }
    return 'idle'
  }, [isAnimating, isGesturing, direction])
  
  const lastSlideIndex = useMemo(() => videoSections.length - 1, [])
  
  // ===== PHYSICS ENGINE INTEGRATION =====
  // Handles: dt-based momentum, iOS-like coast, snap spring, micro rubber-band
  // NOTE: commit/rollback MUST NOT trigger keyframe-based scrollToIndex() for trackpad,
  // otherwise you'll see a second \"pulse\". We finalize instantly like the legacy trackpad path.
  const physicsCommitHandler = useCallback((dir: GestureDirection) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:332',message:'physicsCommitHandler called',data:{dir,activeIndex:activeIndexRef.current,lastSlideIndex,physicsState:physics.getSnapshot().state,isCommitting:isCommittingRef.current,trackpadCommitLock:trackpadCommitLockRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
    if (!dir) return
    
    // CRITICAL: Prevent multiple commits during fast scrolling
    // This can happen when snap animations complete rapidly in succession
    if (isCommittingRef.current || trackpadCommitLockRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:340',message:'physicsCommitHandler SKIPPED - already committing',data:{dir,isCommitting:isCommittingRef.current,trackpadCommitLock:trackpadCommitLockRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'T'})}).catch(()=>{});
      // #endregion
      return
    }
    // Footer special-case on last slide
    if (dir === 'next' && activeIndexRef.current === lastSlideIndex) {
      // Let existing footer logic handle open; we just exit gesture state.
      resetGesture()
      const canOpenFooter = !isAnimatingRef.current && lastSlideArrivedAtRef.current > 0
      if (canOpenFooter) openFooter()
      return
    }
    const nextIdx =
      dir === 'next'
        ? clampIndex(activeIndexRef.current + 1)
        : clampIndex(activeIndexRef.current - 1)
    if (nextIdx === activeIndexRef.current) {
      resetGesture()
      return
    }
    // Finalize WITHOUT keyframes (no second movement)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:351',message:'Calling finalizeTrackpadGesture from physicsCommitHandler',data:{nextIdx,physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    finalizeTrackpadGesture(1, nextIdx)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:354',message:'physicsCommitHandler completed',data:{physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
  // NOTE: intentionally empty deps to avoid TDZ issues (finalizeTrackpadGesture/openFooter are declared later).
  // These callbacks are only invoked after initial render, when all hooks are initialized.
  }, [])
  
  const physicsRollbackHandler = useCallback(() => {
    // Spring back handled by physics engine; when it settles at 0 we finalize.
    finalizeTrackpadGesture(0, null)
  }, [])
  
  const physicsStateChangeHandler = useCallback((state: GestureState, prevState: GestureState) => {
    const isActive = state !== 'idle'
    setIsGesturing(isActive)
    
    // When entering interacting from idle, set up direction and indices
    if (state === 'interacting' && prevState === 'idle') {
      // Direction and indices are set by input handler
    }
  }, [])
  
  // Initialize physics engine hook
  const physics = useGesturePhysics({
    wrapperRef: videoWrapperRef,
    onCommit: physicsCommitHandler,
    onRollback: physicsRollbackHandler,
    onStateChange: physicsStateChangeHandler,
    updateReactProgressState: false,
  })
  
  // Track if physics engine is active for current gesture
  const usePhysicsEngineRef = useRef(false)

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

  // Stop momentum animation
  const stopMomentumAnimation = useCallback(() => {
    if (momentumRafRef.current) {
      window.cancelAnimationFrame(momentumRafRef.current)
      momentumRafRef.current = null
    }
    isMomentumActiveRef.current = false
  }, [])

  // NOTE: Velocity calculation is now handled by physics engine

  // Add a velocity sample
  const addVelocitySample = useCallback((progress: number) => {
    const now = performance.now()
    velocitySamplesRef.current.push({ progress, ts: now })
    
    // Keep only recent samples
    if (velocitySamplesRef.current.length > MAX_VELOCITY_SAMPLES) {
      velocitySamplesRef.current = velocitySamplesRef.current.slice(-MAX_VELOCITY_SAMPLES)
    }
    
    // Clean old samples
    velocitySamplesRef.current = velocitySamplesRef.current.filter(
      s => now - s.ts < VELOCITY_WINDOW_MS * 2
    )
  }, [])

  // Clear velocity samples
  const clearVelocitySamples = useCallback(() => {
    velocitySamplesRef.current = []
  }, [])

  const finalizeTrackpadGesture = useCallback(
    (target: 0 | 1, nextIndex: number | null) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:485',message:'finalizeTrackpadGesture called',data:{target,nextIndex,physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      debugLog({
        type: 'release_finalize',
        timestamp: performance.now(),
        data: {
          target,
          nextIndex,
          gestureProgress: gestureProgressRef.current.toFixed(3),
          activeIndex: activeIndexRef.current,
          source: 'trackpad',
          action: target === 1 ? 'commit' : 'rollback'
        }
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:512',message:'finalizeTrackpadGesture: stopping timers',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      stopFinalizeTimer()
      stopGestureTimer()
      stopGestureRaf()

      // Lock input to avoid inertia tail causing another gesture.
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:518',message:'finalizeTrackpadGesture: setting locks',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      isCommittingRef.current = true
      isAnimatingRef.current = true
      trackpadCommitLockRef.current = true
      
      // CRITICAL: For trackpad, snap animation already completed via physics engine
      // No need to set isAnimating=true as it creates a second visual animation
      // Just ensure data-animating="false" so captions appear immediately
      if (target === 1 && nextIndex !== null) {
        // Set direction for state tracking (not for animation)
        const animDirection = nextIndex > activeIndexRef.current ? 'next' : 'prev'
        setDirection(animDirection)
        setFromIndex(activeIndexRef.current)
        setIncomingIndex(nextIndex)
        
        // CRITICAL: Ensure isAnimating is false so captions appear immediately
        // Snap animation already completed, no need for additional animation state
        setIsAnimating(false)
        isAnimatingRef.current = false
        
        // Clear transitional states after a brief delay to allow captions to appear
        setTimeout(() => {
          setDirection(null)
          setIncomingIndex(null)
        }, 150) // Brief delay to allow captions to appear smoothly
      }
      
      debugLog({
        type: 'commit_lock',
        timestamp: performance.now(),
        data: { locked: true, reason: 'finalize_trackpad_gesture' }
      })
      
      scheduleTrackpadUnlock()
      
      // CRITICAL: Check physics state BEFORE setActiveIndex to avoid interrupting snap animation
      // If physics is snapping, we must NOT reset it, as it needs to complete naturally
      const currentPhysicsState = physics.getSnapshot().state
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:533',message:'finalizeTrackpadGesture: checking physics state BEFORE setActiveIndex',data:{target,nextIndex,physicsState:currentPhysicsState},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      
      // CRITICAL: Decide whether to reset physics BEFORE setActiveIndex (which may cause re-render)
      // Store the decision in a variable to use after setActiveIndex
      const shouldResetPhysics = currentPhysicsState !== 'snapping'
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:540',message:'finalizeTrackpadGesture: decided on physics reset',data:{shouldResetPhysics,physicsState:currentPhysicsState},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      // ATOMIC STATE UPDATE: Finalize trackpad gesture
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:549',message:'finalizeTrackpadGesture: checking condition before setActiveIndex',data:{target,nextIndex,conditionResult:target === 1 && nextIndex !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      if (target === 1 && nextIndex !== null) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:555',message:'TRY BLOCK ENTERED',data:{target,nextIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'N'})}).catch(()=>{});
          // #endregion
          
          // Commit gesture - update to new index immediately (no CSS keyframes for trackpad)
          // Use flushSync to ensure state updates are applied synchronously before continuing
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:563',message:'BEFORE flushSync',data:{nextIndex,currentActiveIndex:activeIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'N'})}).catch(()=>{});
          // #endregion
          flushSync(() => {
            setActiveIndex(nextIndex)
            setFromIndex(nextIndex)
          })
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:571',message:'AFTER flushSync',data:{nextIndex,newActiveIndex:activeIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'N'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:575',message:'CATCH BLOCK - ERROR OCCURRED',data:{error:String(error),stack:error instanceof Error ? error.stack : 'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'N'})}).catch(()=>{});
          // #endregion
          throw error
        }
        lastSlideArrivedAtRef.current = nextIndex === lastSlideIndex ? performance.now() : 0
        postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:553',message:'finalizeTrackpadGesture AFTER setActiveIndex',data:{nextIndex,postCommitIgnoreUntil:postCommitIgnoreUntilRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      const wrapperEl = videoWrapperRef.current;
      const gestureProgressVar = wrapperEl ? getComputedStyle(wrapperEl).getPropertyValue('--gesture-progress') : 'N/A';
      const dataGesture = wrapperEl?.getAttribute('data-gesture') || 'N/A';
      const dataDirection = wrapperEl?.getAttribute('data-direction') || 'N/A';
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:530',message:'finalizeTrackpadGesture BEFORE clearing gesture state',data:{dataGesture,dataDirection,gestureProgressVar,currentGestureProgress:gestureProgressRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Clear transitional states, exit gesture mode
      // CRITICAL: Don't clear incomingIndex/direction here if we set isAnimating=true above
      // They will be cleared by the setTimeout callback after animation "completes"
      if (target !== 1 || nextIndex === null) {
        setIncomingIndex(null)
        setDirection(null)
      }
      setIsGesturing(false)
      setGestureProgress(0)
      
      // CRITICAL: For trackpad, we must NOT clear data-gesture and --gesture-progress here,
      // as this happens before React updates data-state of sections.
      // Instead, we clear them in useEffect after all state updates complete.
      // This prevents dark screen flashes when sections have data-state="next"/"prev" but data-gesture="false"
      
      // #region agent log
      requestAnimationFrame(() => {
        const wrapperEl2 = videoWrapperRef.current;
        const dataGesture2 = wrapperEl2?.getAttribute('data-gesture') || 'N/A';
        const dataDirection2 = wrapperEl2?.getAttribute('data-direction') || 'N/A';
        const gestureProgressVar2 = wrapperEl2 ? getComputedStyle(wrapperEl2).getPropertyValue('--gesture-progress') : 'N/A';
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:535',message:'finalizeTrackpadGesture AFTER clearing gesture state (RAF)',data:{dataGesture:dataGesture2,dataDirection:dataDirection2,gestureProgressVar:gestureProgressVar2},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      });
      // #endregion

      // Reset refs
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:577',message:'finalizeTrackpadGesture: resetting refs',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      gestureDirectionRef.current = null
      gestureLockedRef.current = false
      gestureProgressRef.current = 0
      clearVelocitySamples()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:582',message:'finalizeTrackpadGesture: refs reset, before unlock flags',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      // Unlock flags; keep commitLock until wheel stream goes idle (scheduleTrackpadUnlock).
      isAnimatingRef.current = false
      isCommittingRef.current = false
      
      // CRITICAL: Reset physics engine if needed (decision was made before setActiveIndex)
      // If it's snapping, let it complete naturally and transition to idle
      // This prevents interrupting the snap animation which would prevent the idle transition
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:612',message:'Checking if physics.reset() needed in finalizeTrackpadGesture',data:{shouldResetPhysics,physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      if (shouldResetPhysics) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:616',message:'Calling physics.reset() in finalizeTrackpadGesture',data:{physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        physics.reset()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:619',message:'physics.reset() completed in finalizeTrackpadGesture',data:{physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:622',message:'Skipping physics.reset() - engine is snapping, will transition to idle naturally',data:{physicsState:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:583',message:'UNLOCKED flags in finalizeTrackpadGesture',data:{isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current,trackpadCommitLock:trackpadCommitLockRef.current,postCommitIgnoreUntil:postCommitIgnoreUntilRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    },
    [
      clearVelocitySamples,
      lastSlideIndex,
      scheduleTrackpadUnlock,
      stopFinalizeTimer,
      stopGestureRaf,
      stopGestureTimer,
    ],
  )

  // Smooth rollback animation for gesture reset
  const animateRollback = useCallback(() => {
    stopMomentumAnimation()
    
    const animateFrame = () => {
      const current = gestureProgressRef.current
      if (current > 0.01) {
        // Smooth exponential decay
        const step = current * 0.15
        gestureProgressRef.current = Math.max(0, current - step)
        setGestureProgress(gestureProgressRef.current)
        gestureRafRef.current = requestAnimationFrame(animateFrame)
      } else {
        // Complete reset
        gestureProgressRef.current = 0
        setGestureProgress(0)
        gestureLockedRef.current = false
        gestureDirectionRef.current = null
        setIncomingIndex(null)
        setDirection(null)
        setIsGesturing(false)
        // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
        const wrapper = videoWrapperRef.current
        if (wrapper) {
          wrapper.setAttribute('data-gesture', 'false')
          wrapper.setAttribute('data-direction', 'idle')
          wrapper.style.setProperty('--gesture-progress', '0')
        }
        gestureRafRef.current = null
        clearVelocitySamples()
      }
    }
    
    if (gestureRafRef.current) {
      cancelAnimationFrame(gestureRafRef.current)
    }
    gestureRafRef.current = requestAnimationFrame(animateFrame)
  }, [clearVelocitySamples, stopMomentumAnimation])

  // NOTE: Legacy animateWithMomentum removed - now handled by physics engine

  const scheduleGestureReset = useCallback((delayMs: number) => {
    stopGestureTimer()
    gestureTimerRef.current = window.setTimeout(() => {
      // If we didn't cross the threshold, smoothly snap back
      animateRollback()
    }, delayMs)
  }, [stopGestureTimer, animateRollback])

  // NOTE: Progress updates are now handled by physics engine which writes CSS vars directly
  // which updates CSS vars directly via RAF for optimal performance


  const resetGesture = useCallback(() => {
    debugLog({
      type: 'gesture_reset',
      timestamp: performance.now(),
      data: {
        wasGesturing: gestureProgressRef.current > 0,
        gestureProgress: gestureProgressRef.current.toFixed(3),
        direction: gestureDirectionRef.current,
        isAnimating: isAnimatingRef.current,
        isCommitting: isCommittingRef.current,
        willClearDirection: !isAnimatingRef.current && !isCommittingRef.current
      }
    })
    
    stopGestureTimer()
    stopFinalizeTimer()
    stopGestureRaf()
    gestureLockedRef.current = false
    gestureDirectionRef.current = null
    gestureProgressRef.current = 0
    hasEnteredCommitZoneRef.current = false  // Reset hysteresis
    setGestureProgress(0)
    
    // Only reset transitional states if not animating/committing
    if (!isAnimatingRef.current && !isCommittingRef.current) {
      setIncomingIndex(null)
      setDirection(null)
    }
    // CRITICAL: Always reset data-gesture synchronously when setIsGesturing(false) is called
    // This must happen BEFORE setIsGesturing to prevent race conditions
    const wrapper = videoWrapperRef.current
    if (wrapper) {
      wrapper.setAttribute('data-gesture', 'false')
      wrapper.setAttribute('data-direction', 'idle')
      wrapper.style.setProperty('--gesture-progress', '0')
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
    postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
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
      debugLog({
        type: 'scrollToIndex_begin',
        timestamp: performance.now(),
        data: { blocked: true, reason: 'already_animating', nextIndex }
      })
      return
    }
    
    // If footer overlay is visible/open, close it before navigating sections
    if (isFooterOpen || footerProgressRef.current > 0.02) {
      closeFooter()
    }
    const safeIndex = clampIndex(nextIndex)
    
    // CRITICAL: Block if already at target index
    if (safeIndex === activeIndex) {
      debugLog({
        type: 'scrollToIndex_begin',
        timestamp: performance.now(),
        data: { blocked: true, reason: 'already_at_target', nextIndex, activeIndex }
      })
      return
    }

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'
    
    debugLog({
      type: 'scrollToIndex_begin',
      timestamp: performance.now(),
      data: { 
        blocked: false,
        fromIndex: activeIndex, 
        toIndex: safeIndex, 
        direction: nextDirection,
        wasGesturing: isGesturing,
        gestureProgress: gestureProgressRef.current.toFixed(3)
      }
    })

    // CRITICAL: Set locks IMMEDIATELY before any state updates
    isCommittingRef.current = true
    isAnimatingRef.current = true
    trackpadCommitLockRef.current = true
    
    stopAnimationTimer()
    stopGestureTimer()
    stopFinalizeTimer()
    
    // #region agent log
    const wrapperElBefore = videoWrapperRef.current;
    const dataGestureBefore = wrapperElBefore?.getAttribute('data-gesture') || 'N/A';
    const dataDirectionBefore = wrapperElBefore?.getAttribute('data-direction') || 'N/A';
    const gestureProgressVarBefore = wrapperElBefore ? getComputedStyle(wrapperElBefore).getPropertyValue('--gesture-progress') : 'N/A';
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:760',message:'scrollToIndex BEFORE setState',data:{fromIndex:activeIndex,toIndex:safeIndex,direction:nextDirection,dataGesture:dataGestureBefore,dataDirection:dataDirectionBefore,gestureProgressVar:gestureProgressVarBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // ATOMIC STATE UPDATE: Set all animation states together
    // React 18+ batches these automatically within event handlers
    setFromIndex(activeIndex)
    setIncomingIndex(safeIndex)
    setDirection(nextDirection)
    setIsAnimating(true)
    setIsGesturing(false)
    // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
    const wrapper = videoWrapperRef.current
    if (wrapper) {
      wrapper.setAttribute('data-gesture', 'false')
      wrapper.setAttribute('data-direction', nextDirection)
      wrapper.style.setProperty('--gesture-progress', '0')
    }
    setGestureProgress(0)
    gestureProgressRef.current = 0
    
    // #region agent log
    requestAnimationFrame(() => {
      const wrapperElAfter = videoWrapperRef.current;
      const dataGestureAfter = wrapperElAfter?.getAttribute('data-gesture') || 'N/A';
      const dataDirectionAfter = wrapperElAfter?.getAttribute('data-direction') || 'N/A';
      const gestureProgressVarAfter = wrapperElAfter ? getComputedStyle(wrapperElAfter).getPropertyValue('--gesture-progress') : 'N/A';
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:770',message:'scrollToIndex AFTER setState (RAF)',data:{dataGesture:dataGestureAfter,dataDirection:dataDirectionAfter,gestureProgressVar:gestureProgressVarAfter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    });
    // #endregion
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
    
    // Timeout should match CSS animation duration (0.55s = 550ms) + small buffer
    const timeout = prefersReducedMotion.current ? 100 : 580
    animationTimerRef.current = window.setTimeout(() => {
      // ATOMIC STATE UPDATE: Clear all animation states together
      setIncomingIndex(null)
      setDirection(null)
      setIsAnimating(false)
      
      // Unlock commit locks AFTER state is cleared
      isCommittingRef.current = false
      
      // Extend postCommitIgnoreUntil to absorb trackpad inertia after animation completes
      const now = performance.now()
      const extendedIgnoreUntil = now + POST_COMMIT_IGNORE_MS
      postCommitIgnoreUntilRef.current = extendedIgnoreUntil
      
      // Reset isAnimatingRef AFTER postCommitIgnoreUntil is set
      isAnimatingRef.current = false
      // CRITICAL: Keep trackpadCommitLock active until postCommitIgnoreUntil expires
      // This prevents false gestures from inertia after animation completes
      // Only clear if postCommitIgnoreUntil has expired (handled by scheduleTrackpadUnlock)
      // Don't clear here - let scheduleTrackpadUnlock handle it based on wheel stream idle time
      // Mark when we *actually* arrived at the last slide.
      lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
      animationTimerRef.current = null
      
      debugLog({
        type: 'scrollToIndex_end',
        timestamp: performance.now(),
        data: { 
          finalActiveIndex: safeIndex,
          postCommitIgnoreUntil: postCommitIgnoreUntilRef.current,
          trackpadCommitLock: trackpadCommitLockRef.current
        }
      })
    }, timeout)
  }, [activeIndex, clampIndex, closeFooter, incomingIndex, isFooterOpen, isGesturing, lastSlideIndex, resetGesture, stopAnimationTimer, stopFinalizeTimer, stopGestureTimer])

  const finalizeGesture = useCallback(() => {
    const progress = gestureProgressRef.current
    const dir = gestureDirectionRef.current

    // CRITICAL: Block if already committing or animation in progress
    if (isCommittingRef.current || isAnimatingRef.current) {
      hasEnteredCommitZoneRef.current = false
      return
    }
    // CRITICAL: Block if trackpad commit lock is active (prevents double-commit on fast swipes)
    // CRITICAL: Allow commit if progress is high enough (>= 0.5) even if trackpadCommitLock is active
    const shouldAllowCommit = progress >= 0.5 || !trackpadCommitLockRef.current
    if (trackpadCommitLockRef.current && !shouldAllowCommit) {
      hasEnteredCommitZoneRef.current = false
      return
    }
    if (!dir) {
      hasEnteredCommitZoneRef.current = false
      resetGesture()
      return
    }
    
    // HYSTERESIS: Use different thresholds for entering vs staying in commit zone
    // Once we've entered the commit zone, we need to drop below CANCEL threshold to exit
    const effectiveThreshold = hasEnteredCommitZoneRef.current 
      ? SNAP_THRESHOLD_CANCEL  // Already in zone, need to drop below this to cancel
      : SNAP_THRESHOLD_COMMIT  // Not in zone yet, need to cross this to enter
    
    // Update commit zone tracking
    if (progress >= SNAP_THRESHOLD_COMMIT) {
      hasEnteredCommitZoneRef.current = true
    } else if (progress < SNAP_THRESHOLD_CANCEL) {
      hasEnteredCommitZoneRef.current = false
    }
    
    // Trackpad: "one continuous action" — follow finger during wheel stream,
    // then on release (idle) smoothly settle from current progress to 0/1 WITHOUT restarting keyframes.
    if (lastGestureSourceRef.current === 'trackpad') {
      // Footer special-case stays as before.
      if (dir === 'next' && activeIndex === lastSlideIndex && progress >= effectiveThreshold) {
        const canOpenFooter = !isAnimatingRef.current && lastSlideArrivedAtRef.current > 0
        hasEnteredCommitZoneRef.current = false
        resetGesture()
        if (canOpenFooter) openFooter()
        return
      }

      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      if (progress >= effectiveThreshold) {
        hasEnteredCommitZoneRef.current = false
        finalizeTrackpadGesture(1, nextIndex)
      } else {
        hasEnteredCommitZoneRef.current = false
        finalizeTrackpadGesture(0, null)
      }
      return
    }

    if (progress >= effectiveThreshold) {
      debugLog({
        type: 'threshold_cross',
        timestamp: performance.now(),
        data: {
          progress: progress.toFixed(3),
          effectiveThreshold,
          hasEnteredCommitZone: hasEnteredCommitZoneRef.current,
          direction: dir,
          source: lastGestureSourceRef.current,
          activeIndex,
          action: 'commit'
        }
      })
      
      hasEnteredCommitZoneRef.current = false
      
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
    postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
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
    // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
    const wrapper = videoWrapperRef.current
    if (wrapper) {
      wrapper.setAttribute('data-gesture', 'false')
      wrapper.setAttribute('data-direction', 'idle')
    }
      
      scrollToIndex(nextIndex)
      return
    }

    resetGesture()
  }, [activeIndex, clampIndex, incomingIndex, lastSlideIndex, openFooter, resetGesture, scheduleTrackpadUnlock, scrollToIndex])

  // NOTE: scheduleFinalize is now inlined in handleWheel with physics engine integration

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
    debugWheelDtRef.current = wheelDt // Track for debug overlay
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
        // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
        const wrapper = videoWrapperRef.current
        if (wrapper) {
          wrapper.setAttribute('data-gesture', 'false')
          wrapper.setAttribute('data-direction', 'idle')
          wrapper.style.setProperty('--gesture-progress', '0')
        }
        return
      }

      // Footer closed, wheel down should open it.
      // CRITICAL: Block footer opening if direction changed during active gesture
      // This prevents footer from opening when user reverses scroll direction
      if (dir === 'next') {
        event.preventDefault()
        // Prevent opening while slide is still animating in.
        if (!canOpenFooter) return
        // CRITICAL: Block footer opening if direction changed during active gesture
        // Check if we're in the middle of a gesture and direction just changed
        const physicsSnapshot = physics.getSnapshot()
        const isActiveGesture = physicsSnapshot.state === 'interacting' || physicsSnapshot.state === 'coasting'
        const directionChanged = gestureDirectionRef.current !== null && gestureDirectionRef.current !== dir
        if (isActiveGesture && directionChanged) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1305',message:'Blocking footer open - direction changed during active gesture',data:{dir,gestureDirection:gestureDirectionRef.current,physicsState:physicsSnapshot.state,directionChanged},timestamp:Date.now(),sessionId:'debug-session',runId:'run36',hypothesisId:'AW'})}).catch(()=>{});
          // #endregion
          return
        }
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
      postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
      
      // scrollToIndex will set all necessary states for animation
      // Use requestAnimationFrame to ensure React has time to update DOM before animation starts
      requestAnimationFrame(() => {
        scrollToIndex(nextIndex)
      })
      return
    }

    // CRITICAL FIX: Ignore wheel events during snapping to prevent unnecessary physics.input() calls
    // This reduces load and prevents issues during fast scrolling
    const physicsSnapshot = physics.getSnapshot()
    if (physicsSnapshot.state === 'snapping') {
      event.preventDefault()
      // #region agent log
      if (Math.random() < 0.05) { // Log occasionally to avoid spam
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1372',message:'Wheel event ignored during snapping',data:{physicsState:physicsSnapshot.state,progress:physicsSnapshot.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run32',hypothesisId:'AS'})}).catch(()=>{});
      }
      // #endregion
      return
    }
    
    // If direction changed OR physics engine is idle, restart gesture with smooth transition
    // CRITICAL: Only restart if not already committing/animating
    // CRITICAL: If direction changed during active gesture, let physics engine handle it via progress inversion
    // Check direction change from both gestureDirectionRef and physics engine direction
    // This handles cases where gestureDirectionRef was reset but physics engine still has direction
    const refDirectionChanged = gestureDirectionRef.current !== dir && gestureDirectionRef.current !== null
    const physicsDirectionChanged = physicsSnapshot.direction !== null && physicsSnapshot.direction !== dir
    const directionChanged = refDirectionChanged || physicsDirectionChanged
    const isActiveGesture = physicsSnapshot.state === 'interacting' || physicsSnapshot.state === 'coasting'
    
    // #region agent log
    // Reduced logging frequency to improve performance - only log when direction changes or state changes
    if (directionChanged || Math.random() < 0.01) { // Log 1% of normal events, 100% of direction changes
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1377',message:'Direction check before physics.input()',data:{refDirection:gestureDirectionRef.current,physicsDirection:physicsSnapshot.direction,newDirection:dir,refDirectionChanged,physicsDirectionChanged,directionChanged,isActiveGesture,physicsState:physicsSnapshot.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run13',hypothesisId:'Z'})}).catch(()=>{});
    }
    // #endregion
    
    // If direction changed during active gesture, update ref ONLY, keep old data-direction in DOM
    // CRITICAL: Do NOT update React state direction - keep old data-direction to preserve visual position
    // Physics engine will invert delta sign, allowing progress to decrease naturally
    // This creates smooth reversal effect without visual jump
    if (directionChanged && isActiveGesture) {
      // #region agent log
      const wrapper = videoWrapperRef.current
      const currentDataDirection = wrapper?.getAttribute('data-direction')
      const currentDataGesture = wrapper?.getAttribute('data-gesture')
      const currentGestureProgress = wrapper?.style.getPropertyValue('--gesture-progress')
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1389',message:'Direction changed during active gesture, updating ref and data-direction',data:{oldRefDirection:gestureDirectionRef.current,oldPhysicsDirection:physicsSnapshot.direction,oldReactDirection:direction,oldIncomingIndex:incomingIndex,newDirection:dir,physicsState:physicsSnapshot.state,currentDataDirection,currentDataGesture,currentGestureProgress,currentProgress:physicsSnapshot.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run29',hypothesisId:'AP'})}).catch(()=>{});
      // #endregion
      gestureDirectionRef.current = dir
      // CRITICAL: Do NOT update data-direction when direction changes during active gesture
      // Keep original direction in DOM so CSS continues using the same animation type
      // Physics engine will invert delta sign, allowing progress to decrease naturally
      // This creates smooth reversal effect: section moves back smoothly without changing animation type
      // CRITICAL: Clear incomingIndex when direction changes to prevent triggering adjacent sections
      // This prevents visual glitches where the next section appears briefly when reversing direction
      // Especially important on last slide with footer to prevent unwanted section triggers
      if (incomingIndex !== null) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1425',message:'Clearing incomingIndex on direction change',data:{oldIncomingIndex:incomingIndex,newDirection:dir,activeIndex,lastSlideIndex,isFooterOpen,footerProgress:footerProgressRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run35',hypothesisId:'AV'})}).catch(()=>{});
        // #endregion
        setIncomingIndex(null)
      }
      // Continue to physics.input() below - it will handle direction change smoothly
    }
    
    // If direction changed during active gesture, don't reset - let physics engine invert progress
    const shouldRestartGesture = (physicsSnapshot.state === 'idle') || (directionChanged && !isActiveGesture)
    // #region agent log
    // Reduced logging frequency to improve performance - only log when restarting gesture or direction changes
    if (shouldRestartGesture || directionChanged || Math.random() < 0.01) { // Log 1% of normal events, 100% of important events
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1400',message:'Checking if new gesture should start',data:{currentDirection:gestureDirectionRef.current,newDirection:dir,isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current,physicsState:physicsSnapshot.state,directionChanged,isActiveGesture,shouldRestartGesture},timestamp:Date.now(),sessionId:'debug-session',runId:'run13',hypothesisId:'W'})}).catch(()=>{});
    }
    // #endregion
    if (shouldRestartGesture) {
      // Block if already committing or animating
      if (isCommittingRef.current || isAnimatingRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1293',message:'BLOCKED: already committing/animating',data:{isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return
      }
      
      // CRITICAL: Block new gesture if we're still in the post-commit ignore window
      const postCommitIgnoreUntil = postCommitIgnoreUntilRef.current || 0
      const nowTime = performance.now()
      const wrapperEl = videoWrapperRef.current
      if (nowTime < postCommitIgnoreUntil || isCommittingRef.current || isAnimatingRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1301',message:'BLOCKED: post-commit ignore window',data:{nowTime,postCommitIgnoreUntil,remaining:postCommitIgnoreUntil-nowTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return
      }
      
      // CRITICAL: Clear trackpadCommitLock if postCommitIgnoreUntil has expired
      if (trackpadCommitLockRef.current && nowTime >= postCommitIgnoreUntil) {
        trackpadCommitLockRef.current = false
        stopTrackpadUnlockTimer()
      }
      
      // Start new gesture with physics engine
      debugLog({
        type: 'wheel_start',
        timestamp: nowTime,
        data: {
          source: 'trackpad',
          direction: dir,
          wheelDt,
          deltaY: deltaY.toFixed(1),
          activeIndex,
          isLikelyTrackpad: true
        }
      })
      

      // ATOMIC STATE UPDATE: Start gesture with all state in sync
      gestureDirectionRef.current = dir
      gestureProgressRef.current = 0
      
      // CRITICAL: Reset data-gesture and CSS var BEFORE physics.reset() to prevent stale state
      // This ensures physics engine starts from clean state
      const wrapperForReset = videoWrapperRef.current
      if (wrapperForReset) {
        wrapperForReset.setAttribute('data-gesture', 'false')
        wrapperForReset.setAttribute('data-direction', 'idle')
        wrapperForReset.style.setProperty('--gesture-progress', '0')
      }
      
      // Reset physics engine for new gesture BEFORE setting React state
      // This ensures physics engine starts from clean state
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1340',message:'Calling physics.reset() before starting new gesture',data:{direction:dir,physicsStateBefore:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      physics.reset()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1342',message:'physics.reset() completed',data:{physicsStateAfter:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // CRITICAL: Set DOM attributes BEFORE setIsGesturing to ensure they are set synchronously
      // This prevents race conditions where React state updates async but DOM attributes are set sync
      // CRITICAL: Store original direction in ref to preserve it during direction changes
      const wrapper = videoWrapperRef.current
      if (wrapper) {
        wrapper.setAttribute('data-gesture', 'true')
        wrapper.setAttribute('data-direction', dir)
        // Store original direction to preserve it during direction changes
        gestureDirectionRef.current = dir
      }
      
      // Now set React state (this will trigger async update, but DOM attributes are already set)
      setIsGesturing(true)
      // Log after setting state
      if (wrapper) {
      }
      lastGestureSourceRef.current = 'trackpad'
      usePhysicsEngineRef.current = true
      setFromIndex(activeIndex)
      setDirection(dir)
      setIsAnimating(false)
      setGestureProgress(0)
      setIncomingIndex(null)
      
    }

    stopGestureTimer()
    // CRITICAL: Do NOT call stopFinalizeTimer() here - it should only be cleared when gesture ends
    // Calling it here causes the timer to be recreated on every wheel event, defeating the optimization
    // stopFinalizeTimer() is called in finalizeTrackpadGesture, resetGesture, and other cleanup functions

    // ===== PHYSICS ENGINE: dt-based input =====
    // Calculate delta in progress units (0..1)
    const wheelRange = calculateWheelRange('trackpad', window.innerHeight)
    const progressDelta = absDeltaClamped / wheelRange
    
    // CRITICAL FIX: Throttle physics.input() to prevent overload during fast scrolling
    // Accumulate delta if throttling is active, then apply accumulated delta when throttle expires
    // CRITICAL: Use adaptive throttling - more aggressive for fast scroll (large delta), less for slow scroll
    const timeSinceLastInput = now - lastPhysicsInputTsRef.current
    const isFastScroll = progressDelta > 0.01 // Large delta indicates fast scroll
    const adaptiveThrottle = isFastScroll ? PHYSICS_INPUT_THROTTLE_MS * 1.5 : PHYSICS_INPUT_THROTTLE_MS
    const shouldThrottle = timeSinceLastInput < adaptiveThrottle && lastPhysicsInputTsRef.current > 0
    
    if (shouldThrottle) {
      // Accumulate delta for later processing - will be applied on next non-throttled event
      accumulatedDeltaRef.current += progressDelta
      accumulatedDeltaDirRef.current = dir
      // #region agent log
      if (Math.random() < 0.1) { // Log occasionally to avoid spam
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1508',message:'physics.input() throttled, accumulating delta',data:{progressDelta,accumulatedDelta:accumulatedDeltaRef.current,timeSinceLastInput,dir,isFastScroll,adaptiveThrottle},timestamp:Date.now(),sessionId:'debug-session',runId:'run31',hypothesisId:'AR'})}).catch(()=>{});
      }
      // #endregion
      // CRITICAL: If accumulated delta is large, apply it immediately to prevent lag
      // This ensures fast scrolls are processed quickly even with throttling
      if (accumulatedDeltaRef.current > 0.05) {
        // Large accumulated delta - apply immediately to prevent lag
        const totalDelta = accumulatedDeltaRef.current
        const finalDir = accumulatedDeltaDirRef.current || dir
        accumulatedDeltaRef.current = 0
        accumulatedDeltaDirRef.current = null
        lastPhysicsInputTsRef.current = now
        // Apply accumulated delta
        physics.input(totalDelta, finalDir, 'trackpad')
        return
      }
      // Don't call physics.input() - just accumulate and return
      return
    } else {
      // Apply accumulated delta if any, then apply current delta
      const hadAccumulated = accumulatedDeltaRef.current !== 0
      const totalDelta = accumulatedDeltaRef.current + progressDelta
      const finalDir = accumulatedDeltaDirRef.current || dir
      accumulatedDeltaRef.current = 0
      accumulatedDeltaDirRef.current = null
      lastPhysicsInputTsRef.current = now
      
      // Feed input to physics engine
      // #region agent log
      // Reduced logging frequency to improve performance
      if (Math.random() < 0.05) { // Log only 5% of calls
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1374',message:'Calling physics.input()',data:{progressDelta:totalDelta,dir:finalDir,physicsState:physics.getSnapshot().state,gestureDirection:gestureDirectionRef.current,hadAccumulated},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      physics.input(totalDelta, finalDir, 'trackpad')
      // #region agent log
      // Reduced logging frequency to improve performance
      if (Math.random() < 0.05) { // Log only 5% of calls
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1376',message:'physics.input() completed',data:{physicsStateAfter:physics.getSnapshot().state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
    }
    
    // Sync local refs with physics state for compatibility
    const snapshot = physics.getSnapshot()
    // Keep raw progress for logic; visuals are driven by CSS var from the physics hook.
    gestureProgressRef.current = snapshot.progress
    // NOTE: Do NOT call setGestureProgress here - physics hook updates CSS var directly
    // React state updates cause re-renders which lag trackpad gestures
    
    // Set incomingIndex at 20% progress for visual feedback (increased from 5% to reduce artifacts)
    // CRITICAL: Only update if value actually changes to prevent unnecessary re-renders
    // CRITICAL: Also check that physics direction matches gestureDirectionRef to prevent card swapping on direction change
    if (snapshot.progress >= 0.20 && gestureDirectionRef.current && !isAnimatingRef.current) {
      const physicsDirection = snapshot.direction
      // Only set incomingIndex if physics direction matches gestureDirectionRef
      // This prevents card swapping when direction changes during gesture
      if (physicsDirection === gestureDirectionRef.current) {
        const nextTargetIndex = clampIndex(activeIndex + (gestureDirectionRef.current === 'next' ? 1 : -1))
        if (nextTargetIndex !== activeIndex && nextTargetIndex !== incomingIndex) {
          // #region agent log
          // Reduced logging frequency to improve performance
          if (Math.random() < 0.1) { // Log only 10% of calls
            fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1274',message:'setIncomingIndex called during gesture',data:{progress:snapshot.progress,nextTargetIndex,currentIncomingIndex:incomingIndex,physicsDirection,gestureDirection:gestureDirectionRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          }
          // #endregion
          setIncomingIndex(nextTargetIndex)
        }
      } else if (incomingIndex !== null) {
        // If directions don't match, clear incomingIndex to prevent card swapping
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1285',message:'Clearing incomingIndex - directions mismatch',data:{progress:snapshot.progress,currentIncomingIndex:incomingIndex,physicsDirection,gestureDirection:gestureDirectionRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setIncomingIndex(null)
      }
    }
    
    // Legacy velocity tracking (for compatibility with touch/footer)
    addVelocitySample(snapshot.progress)

    // Trackpad: release on stream idle (physics engine handles coast/snap)
    if (isLikelyTrackpad) {
      // CRITICAL: Reset timer on every wheel event to prevent premature release while user is still scrolling
      // This ensures the timer only fires when user actually stops scrolling
      stopFinalizeTimer()
      
      // #region agent log
      // Reduced logging frequency to improve performance
      if (Math.random() < 0.1) { // Log only 10% of calls
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1499',message:'Setting finalize timer for trackpad',data:{physicsState:physics.getSnapshot().state,gestureProgress:gestureProgressRef.current,isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'M'})}).catch(()=>{});
      }
      // #endregion
      finalizeTimerRef.current = window.setTimeout(() => {
        finalizeTimerRef.current = null
        
        const currentPhysicsState = physics.getSnapshot().state
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1503',message:'Finalize timer fired',data:{physicsState:currentPhysicsState,gestureProgress:gestureProgressRef.current,isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'O'})}).catch(()=>{});
        // #endregion
        
        if (isCommittingRef.current || isAnimatingRef.current) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1516',message:'Finalize timer skipped - committing or animating',data:{isCommitting:isCommittingRef.current,isAnimating:isAnimatingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'O'})}).catch(()=>{});
          // #endregion
          return
        }

        // CRITICAL: Don't call release() if physics engine is already snapping or coasting
        // Snap/coast animation will complete naturally and trigger onCommit callback
        if (currentPhysicsState === 'snapping' || currentPhysicsState === 'coasting') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1522',message:'Finalize timer skipped - physics already snapping/coasting',data:{physicsState:currentPhysicsState},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'O'})}).catch(()=>{});
          // #endregion
          return
        }
        
        // CRITICAL: Only call release() if physics engine is still in 'interacting' state
        // If state changed (e.g., to 'idle' or 'snapping'), don't call release() to avoid double commits
        if (currentPhysicsState !== 'interacting') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1528',message:'Finalize timer skipped - physics state not interacting',data:{physicsState:currentPhysicsState},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'O'})}).catch(()=>{});
          // #endregion
          return
        }

        // IMPORTANT: Do NOT call scrollToIndex() here.
        // Let the physics engine coast/snap, then commit via physicsCommitHandler (finalizeTrackpadGesture),
        // otherwise you get a second movement pulse from CSS keyframes.
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1530',message:'Calling physics.release() from timer',data:{physicsState:currentPhysicsState,gestureProgress:gestureProgressRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'O'})}).catch(()=>{});
        // #endregion
        physics.release()
      }, TRACKPAD_GESTURE_IDLE_FINALIZE_MS)
      return
    }

    // Mouse wheel: keep the older snappy behavior (instant commit at threshold)
    const mouseProgress = gestureProgressRef.current
    if (mouseProgress >= SNAP_THRESHOLD) {
      if (isCommittingRef.current || isAnimatingRef.current || trackpadCommitLockRef.current) {
        return
      }
      
      gestureLockedRef.current = true
      isCommittingRef.current = true
      trackpadCommitLockRef.current = true
      postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
      trackpadCommitLockExpiresAtRef.current = performance.now() + 1200
      scheduleTrackpadUnlock()
      physics.reset()
      finalizeGesture()
      return
    }

    scheduleGestureReset(WHEEL_GESTURE_IDLE_RESET_MS)
  }, [
    activeIndex,
    addVelocitySample,
    clampIndex,
    closeFooter,
    finalizeGesture,
    incomingIndex,
    isFooterOpen,
    lastSlideIndex,
    openFooter,
    physics,
    resetGesture,
    scheduleGestureReset,
    scheduleTrackpadUnlock,
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
    
    // Stop any ongoing momentum animation and reset physics engine
    stopMomentumAnimation()
    physics.reset()
    
    gestureLockedRef.current = false
    touchStartY.current = event.touches[0]?.clientY ?? 0
    // CRITICAL: Store the target element where touch started
    touchStartTargetRef.current = event.target as HTMLElement
    
    // Initialize touch velocity tracking
    const now = performance.now()
    touchVelocitySamplesRef.current = [{ y: touchStartY.current, ts: now }]
    clearVelocitySamples()
    lastGestureSourceRef.current = 'touch'
    usePhysicsEngineRef.current = true
    
    resetGesture()
  }, [clearVelocitySamples, physics, prefersReducedMotion, resetGesture, stopMomentumAnimation])

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
      // ATOMIC STATE UPDATE: Start touch gesture with all state in sync
      gestureDirectionRef.current = dir
      setIsGesturing(true)
      // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
      const wrapper = videoWrapperRef.current
      if (wrapper) {
        wrapper.setAttribute('data-gesture', 'true')
        wrapper.setAttribute('data-direction', dir)
      }
      setFromIndex(activeIndex)
      setDirection(dir)
      setIsAnimating(false)
      setIncomingIndex(null)
      lastGestureSourceRef.current = 'touch'
      physics.reset()
    }

    // ===== PHYSICS ENGINE: Touch input =====
    const range = calculateWheelRange('touch', window.innerHeight)
    const progressDelta = Math.abs(diff) / range - gestureProgressRef.current
    
    // Feed input to physics engine
    if (progressDelta > 0) {
      physics.input(progressDelta, dir, 'touch')
    }
    
    // Sync local refs with physics state
    const snapshot = physics.getSnapshot()
    // Keep raw progress for logic; visuals are driven by CSS var from the physics hook.
    gestureProgressRef.current = snapshot.progress
    // NOTE: Do NOT call setGestureProgress here - physics hook updates CSS var directly
    
    // Track touch velocity for legacy momentum (footer)
    const now = performance.now()
    touchVelocitySamplesRef.current.push({ y, ts: now })
    if (touchVelocitySamplesRef.current.length > MAX_VELOCITY_SAMPLES) {
      touchVelocitySamplesRef.current = touchVelocitySamplesRef.current.slice(-MAX_VELOCITY_SAMPLES)
    }
    addVelocitySample(snapshot.progress)
    
    // Set incomingIndex at 5% progress for visual feedback
    if (snapshot.progress >= 0.05 && !incomingIndex && gestureDirectionRef.current) {
      const nextTargetIndex = clampIndex(activeIndex + (gestureDirectionRef.current === 'next' ? 1 : -1))
      if (nextTargetIndex !== activeIndex) {
        setIncomingIndex(nextTargetIndex)
      }
    }
  }, [
    addVelocitySample,
    activeIndex,
    clampIndex,
    incomingIndex,
    isFooterOpen,
    lastSlideIndex,
    physics,
    resetGesture,
    setFooterProgressSafe,
    stopGestureTimer,
  ])

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimatingRef.current) return
    
    // CRITICAL: Stop any pending timers when touch ends
    stopGestureTimer()
    stopFinalizeTimer()
    gestureLockedRef.current = false
    
    // Footer handling on last slide (uses legacy logic for now)
    if (activeIndex === lastSlideIndex) {
      if (!isFooterOpen) {
        if (footerProgressRef.current >= SNAP_THRESHOLD) openFooter()
        else closeFooter()
      } else {
        if (footerProgressRef.current <= (1 - SNAP_THRESHOLD)) closeFooter()
        else openFooter()
      }
      setIsGesturing(false)
      // CRITICAL: Sync data-gesture synchronously (not via useEffect) to prevent race condition
      const wrapper = videoWrapperRef.current
      if (wrapper) {
        wrapper.setAttribute('data-gesture', 'false')
        wrapper.setAttribute('data-direction', 'idle')
        wrapper.style.setProperty('--gesture-progress', '0')
      }
      physics.reset()
      resetGesture()
      clearVelocitySamples()
      return
    }
    
    // ===== PHYSICS ENGINE: Touch release =====
    if (gestureProgressRef.current > 0 && gestureDirectionRef.current) {
      const snapshot = physics.getSnapshot()
      const progress = snapshot.progress
      const dir = gestureDirectionRef.current
      
      // Check if we should commit based on progress threshold
      if (progress >= SNAP_THRESHOLD) {
        // Commit - calculate next index and scroll
        isCommittingRef.current = true
        trackpadCommitLockRef.current = true
        postCommitIgnoreUntilRef.current = performance.now() + POST_COMMIT_IGNORE_MS
        scheduleTrackpadUnlock()
        
        const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
        if (nextIndex !== activeIndex) {
          physics.reset()
          scrollToIndex(nextIndex)
        } else {
          physics.release()
        }
      } else {
        // Rollback - physics engine handles spring animation
        physics.release()
      }
    } else {
      physics.reset()
      resetGesture()
    }
    clearVelocitySamples()
  }, [activeIndex, clampIndex, clearVelocitySamples, closeFooter, isFooterOpen, lastSlideIndex, openFooter, physics, resetGesture, scheduleTrackpadUnlock, scrollToIndex, stopFinalizeTimer, stopGestureTimer])

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
      stopMomentumAnimation()
    }
  }, [stopAnimationTimer, stopFinalizeTimer, stopGestureTimer, stopMomentumAnimation, stopTrackpadUnlockTimer])

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
  // Also runs invariant checks in debug mode.
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:1957',message:'useEffect triggered by state change',data:{activeIndex,fromIndex,direction,incomingIndex,isGesturing,isAnimating,gestureProgress,lastSlideIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'L'})}).catch(()=>{});
    // #endregion
    checkDeckInvariants({
      activeIndex,
      fromIndex,
      incomingIndex,
      direction,
      isAnimating,
      isGesturing,
      gestureProgress,
      lastSlideIndex,
    })
    
    // Log mode changes
    debugLog({
      type: 'mode_change',
      timestamp: performance.now(),
      data: {
        activeIndex,
        fromIndex,
        incomingIndex,
        direction,
        isAnimating,
        isGesturing,
        gestureProgress: gestureProgress.toFixed(3),
      }
    })
    
    // CRITICAL: Clear data-gesture and --gesture-progress after all state updates complete
    // This ensures sections have correct data-state before we clear gesture attributes
    // This prevents dark screen flashes when sections have data-state="next"/"prev" but data-gesture="false"
    if (!isGesturing && !direction && !incomingIndex) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2016',message:'useEffect: condition met for clearing data-gesture',data:{activeIndex,fromIndex,direction,incomingIndex,isGesturing},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'R'})}).catch(()=>{});
      // #endregion
      // Use double RAF to ensure React has updated all DOM attributes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const wrapper = videoWrapperRef.current
          if (wrapper) {
            const currentDataGesture = wrapper.getAttribute('data-gesture')
            const physicsSnapshot = physics.getSnapshot()
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2024',message:'useEffect: checking data-gesture value',data:{currentDataGesture,activeIndex,fromIndex,direction,incomingIndex,isGesturing,physicsState:physicsSnapshot.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'R'})}).catch(()=>{});
            // #endregion
            // Only clear if still set to 'true' (not already cleared)
            // CRITICAL: Don't clear data-direction during snapping to prevent animation type change
            // Keep original direction until snap animation completes
            if (currentDataGesture === 'true') {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2028',message:'Clearing data-gesture in useEffect after state updates',data:{activeIndex,fromIndex,direction,incomingIndex,isGesturing,physicsState:physicsSnapshot.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'R'})}).catch(()=>{});
              // #endregion
              wrapper.setAttribute('data-gesture', 'false')
              // CRITICAL: Only set data-direction to 'idle' if physics engine is truly idle
              // During snapping, keep original direction to prevent animation type change
              if (physicsSnapshot.state === 'idle') {
                wrapper.setAttribute('data-direction', 'idle')
              }
              // Only clear progress if physics engine is idle
              if (physicsSnapshot.state === 'idle') {
                wrapper.style.setProperty('--gesture-progress', '0')
              }
            } else {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2034',message:'useEffect: data-gesture already cleared, skipping',data:{currentDataGesture,activeIndex,fromIndex,direction,incomingIndex,isGesturing},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'R'})}).catch(()=>{});
              // #endregion
            }
          }
        })
      })
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2040',message:'useEffect: condition NOT met for clearing data-gesture',data:{activeIndex,fromIndex,direction,incomingIndex,isGesturing},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'R'})}).catch(()=>{});
      // #endregion
    }
    
    // #region agent log
    requestAnimationFrame(() => {
      const wrapperEl = videoWrapperRef.current;
      if (wrapperEl) {
        const dataGesture = wrapperEl.getAttribute('data-gesture') || 'N/A';
        const dataDirection = wrapperEl.getAttribute('data-direction') || 'N/A';
        const gestureProgressVar = getComputedStyle(wrapperEl).getPropertyValue('--gesture-progress');
        const sections = wrapperEl.querySelectorAll('.videoSection');
        const sectionStyles: Record<string, any> = {};
        sections.forEach((section, idx) => {
          const el = section as HTMLElement;
          const computed = getComputedStyle(el);
          const dataState = el.getAttribute('data-state') || 'N/A';
          sectionStyles[`section_${idx}`] = {
            dataState,
            opacity: computed.opacity,
            visibility: computed.visibility,
            transform: computed.transform,
            zIndex: computed.zIndex,
          };
        });
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Home/index.tsx:2005',message:'CSS computed styles after state change',data:{isGesturing,isAnimating,direction,dataGesture,dataDirection,gestureProgressVar,sectionStyles},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'L'})}).catch(()=>{});
      }
    });
    // #endregion
  }, [activeIndex, fromIndex, direction, incomingIndex, isGesturing, isAnimating, gestureProgress, lastSlideIndex])

  // NOTE: data-gesture and data-direction are now synced synchronously in event handlers
  // (setIsGesturing, finalizeTrackpadGesture, resetGesture, etc.)
  // This useEffect is removed to prevent race conditions where async React state updates
  // conflict with synchronous physics engine operations

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
        data-animating={isAnimating ? 'true' : 'false'}
        data-mode={deckMode}
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

      {/* Debug Overlay */}
      {debugMode && (
        <DebugOverlay
          activeIndex={activeIndex}
          fromIndex={fromIndex}
          incomingIndex={incomingIndex}
          direction={direction}
          isAnimating={isAnimating}
          isGesturing={isGesturing}
          gestureProgress={gestureProgress}
          footerProgress={footerProgress}
          isFooterOpen={isFooterOpen}
          trackpadCommitLock={trackpadCommitLockRef.current}
          postCommitIgnoreUntil={postCommitIgnoreUntilRef.current}
          lastWheelDt={debugWheelDtRef.current}
          gestureSource={lastGestureSourceRef.current}
        />
      )}

    </motion.div>
  )
}
