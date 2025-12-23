import { useRef, useCallback, useEffect } from 'react'

// Constants
const TRACKPAD_DELTA_CUTOFF = 85
const TRACKPAD_STREAM_CUTOFF_MS = 180
const TRACKPAD_FAST_VELOCITY_THRESHOLD = 1.2 // px/ms
const TRACKPAD_VELOCITY_SAMPLE_WINDOW = 50
const TRACKPAD_START_DELTA = 6
const TRACKPAD_START_ACCUM_WINDOW = 120
const TRACKPAD_FINALIZE_DELAY = 70 // Reduced from 110ms to 60-80ms range (70ms)
const TRACKPAD_SNAP_THRESHOLD = 0.4 // Reduced from 0.5 for better control

export interface GestureUpdateState {
  offsetPx: number // пиксели сдвига (не нормализованный 0-1)
  velocity: number // px/ms
  direction: 'next' | 'prev' | null
  phase: 'idle' | 'drag' | 'snap-back' | 'snap-forward'
  progress: number // normalized 0-1 for compatibility
}

export interface UseTrackpadGestureOptions {
  onGestureUpdate: (state: GestureUpdateState) => void
  onGestureCommit: (direction: 'next' | 'prev', isFast: boolean) => void
  wheelRange: number
}

type GesturePhase = 'idle' | 'drag' | 'snap-back' | 'snap-forward'

export function useTrackpadGesture(options: UseTrackpadGestureOptions) {
  const { onGestureUpdate, onGestureCommit, wheelRange } = options

  // Internal state refs
  const offsetPxRef = useRef(0) // накопленный сдвиг в пикселях
  const velocityRef = useRef(0) // текущая скорость (px/ms)
  const gesturePhaseRef = useRef<GesturePhase>('idle')
  const directionRef = useRef<'next' | 'prev' | null>(null)
  const needsPublishRef = useRef(false)
  const isGesturingRef = useRef(false)

  // Timer refs
  const idleTimerRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Velocity tracking
  const velocitySampleRef = useRef<{ ts: number; delta: number }>({ ts: 0, delta: 0 })
  const startAccumRef = useRef<{ sum: number; ts: number }>({ sum: 0, ts: 0 })
  const lastWheelTsRef = useRef(0)

  // Input source detection (trackpad vs mouse)
  const inputSourceRef = useRef<'trackpad' | 'mouse' | null>(null)

  // Detect input source (fixed for session)
  const detectInputSource = useCallback((event: WheelEvent, wheelDt: number): 'trackpad' | 'mouse' => {
    const isTrackpad =
      event.deltaMode === 0 &&
      (Math.abs(event.deltaY) < TRACKPAD_DELTA_CUTOFF || wheelDt < TRACKPAD_STREAM_CUTOFF_MS)
    return isTrackpad ? 'trackpad' : 'mouse'
  }, [])

  // Reset state
  const resetState = useCallback(() => {
    offsetPxRef.current = 0
    velocityRef.current = 0
    gesturePhaseRef.current = 'idle'
    directionRef.current = null
    isGesturingRef.current = false
    velocitySampleRef.current = { ts: 0, delta: 0 }
    startAccumRef.current = { sum: 0, ts: 0 }
    
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  // Finalize gesture (idle timeout)
  const finalizeGesture = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:77',message:'finalizeGesture called',data:{phase:gesturePhaseRef.current,direction:directionRef.current,offsetPx:offsetPxRef.current,velocity:velocityRef.current,wheelRange},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    if (gesturePhaseRef.current !== 'drag' || !directionRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:84',message:'finalizeGesture: early return - invalid state',data:{phase:gesturePhaseRef.current,direction:directionRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      resetState()
      return
    }

    const normalizedProgress = Math.min(1, offsetPxRef.current / wheelRange)
    const isFast = velocityRef.current > TRACKPAD_FAST_VELOCITY_THRESHOLD
    const shouldCommit = normalizedProgress >= TRACKPAD_SNAP_THRESHOLD || isFast

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:92',message:'finalizeGesture: decision',data:{normalizedProgress,isFast,shouldCommit,threshold:TRACKPAD_SNAP_THRESHOLD},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    if (shouldCommit) {
      // Commit: snap forward - notify commit, let finalizeTrackpadGesture handle animation
      gesturePhaseRef.current = 'snap-forward'
      needsPublishRef.current = true
      
      // Notify commit immediately - finalizeTrackpadGesture will handle smooth animation
      if (directionRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:100',message:'finalizeGesture: calling onGestureCommit',data:{direction:directionRef.current,isFast},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        onGestureCommit(directionRef.current, isFast)
      }
    } else {
      // Rollback: snap back
      gesturePhaseRef.current = 'snap-back'
      needsPublishRef.current = true
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:107',message:'finalizeGesture: rollback',data:{normalizedProgress,threshold:TRACKPAD_SNAP_THRESHOLD},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    }
  }, [wheelRange, onGestureCommit, resetState])

  // Schedule finalize timer
  const scheduleFinalize = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(finalizeGesture, TRACKPAD_FINALIZE_DELAY)
  }, [finalizeGesture])

  // RAF loop for batched updates
  useEffect(() => {
    let frameId: number
    
    const loop = () => {
      if (needsPublishRef.current) {
        const currentState: GestureUpdateState = {
          offsetPx: offsetPxRef.current,
          velocity: velocityRef.current,
          direction: directionRef.current,
          phase: gesturePhaseRef.current,
          progress: Math.min(1, offsetPxRef.current / wheelRange),
        }
        
        onGestureUpdate(currentState)
        needsPublishRef.current = false
      }
      
      frameId = requestAnimationFrame(loop)
    }
    
    frameId = requestAnimationFrame(loop)
    
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [onGestureUpdate, wheelRange])

  // Handle wheel event
  const handleWheelEvent = useCallback(
    (event: WheelEvent): boolean => {
      let deltaY = event.deltaY || 0
      if (event.deltaMode === 1) deltaY *= 16
      if (event.deltaMode === 2) deltaY *= window.innerHeight

      const now = performance.now()
      const wheelDt = now - lastWheelTsRef.current
      lastWheelTsRef.current = now

      // Detect input source (only on first event or after long pause > 1s)
      if (!inputSourceRef.current || (now - lastWheelTsRef.current > 1000)) {
        inputSourceRef.current = detectInputSource(event, wheelDt)
      }

      // Only handle trackpad
      if (inputSourceRef.current !== 'trackpad') {
        resetState()
        return false
      }

      const absDelta = Math.abs(deltaY)
      const clampedDelta = Math.min(absDelta, 120)
      const direction = deltaY > 0 ? ('next' as const) : ('prev' as const)

      // Velocity calculation
      const prevSample = velocitySampleRef.current
      if (prevSample.ts && now - prevSample.ts < TRACKPAD_VELOCITY_SAMPLE_WINDOW) {
        const dt = Math.max(1, now - prevSample.ts)
        const velocity = clampedDelta / dt
        // Exponential moving average
        velocityRef.current = velocity * 0.7 + velocityRef.current * 0.3
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      } else {
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      }

      // Start detection - ignore tiny deltas at beginning
      if (!isGesturingRef.current && clampedDelta < TRACKPAD_START_DELTA) {
        const lastAccum = startAccumRef.current
        if (!lastAccum.ts || now - lastAccum.ts > TRACKPAD_START_ACCUM_WINDOW) {
          startAccumRef.current = { sum: 0, ts: now }
        }
        startAccumRef.current.sum += clampedDelta

        if (startAccumRef.current.sum < TRACKPAD_START_DELTA) {
          return true // consume event but don't update
        }
        // Threshold crossed, start gesture
        startAccumRef.current = { sum: 0, ts: 0 }
      } else {
        startAccumRef.current = { sum: 0, ts: 0 }
      }

      // New gesture
      if (!isGesturingRef.current) {
        isGesturingRef.current = true
        gesturePhaseRef.current = 'drag'
        directionRef.current = direction
        offsetPxRef.current = 0
        velocityRef.current = 0
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      }

      // Direction change
      if (directionRef.current !== direction) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:213',message:'Direction change detected',data:{oldDirection:directionRef.current,newDirection:direction,offsetPxBefore:offsetPxRef.current,phase:gesturePhaseRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Reset offset on direction change
        directionRef.current = direction
        offsetPxRef.current = 0
        velocityRef.current = 0
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      }

      // Update offset (accumulate deltaY)
      // For vertical page flipping: 
      // - deltaY > 0 (scroll down) = next direction = progress increases (0→1)
      // - deltaY < 0 (scroll up) = prev direction = progress increases (0→1)
      // Progress maps to translateY: progress 0 = translateY(100% for next, -100% for prev), progress 1 = translateY(0)
      // We accumulate positive offset for both directions (absolute movement)
      offsetPxRef.current += clampedDelta

      // Clamp offset to reasonable bounds
      const maxOffset = wheelRange * 1.1 // Allow slight overscroll
      offsetPxRef.current = Math.max(-maxOffset, Math.min(maxOffset, offsetPxRef.current))

      // #region agent log
      const normalizedProgress = offsetPxRef.current / wheelRange
      if (Math.random() < 0.05) { // Log 5% of events
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTrackpadGesture.ts:234',message:'Offset update',data:{clampedDelta,offsetPxBefore:offsetPxRef.current - clampedDelta,offsetPx:offsetPxRef.current,wheelRange,normalizedProgress,velocity:velocityRef.current,phase:gesturePhaseRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion

      // NOTE: Removed immediate commit on threshold/velocity - let user drag freely
      // Commit will happen on finalize (idle timeout) based on progress threshold

      // Mark for RAF update
      needsPublishRef.current = true
      scheduleFinalize()
      
      return true
    },
    [detectInputSource, resetState, scheduleFinalize, wheelRange, onGestureCommit],
  )

  // Cleanup
  const cleanup = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    resetState()
  }, [resetState])

  return {
    handleWheelEvent,
    cleanup,
    getState: () => ({
      offsetPx: offsetPxRef.current,
      velocity: velocityRef.current,
      direction: directionRef.current,
      phase: gesturePhaseRef.current,
      progress: Math.min(1, offsetPxRef.current / wheelRange),
    }),
  }
}