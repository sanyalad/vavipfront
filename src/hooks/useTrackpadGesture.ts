import { useRef, useCallback } from 'react'

export type TrackpadGestureCallback = (direction: 'next' | 'prev', progress: number, isCommit: boolean) => void

const TRACKPAD_DELTA_CUTOFF = 85
const TRACKPAD_STREAM_CUTOFF_MS = 180
const TRACKPAD_FAST_VELOCITY_THRESHOLD = 1.2 // px/ms
const TRACKPAD_VELOCITY_SAMPLE_WINDOW = 50
const TRACKPAD_START_DELTA = 6
const TRACKPAD_START_ACCUM_WINDOW = 120
const TRACKPAD_FINALIZE_DELAY = 110
const TRACKPAD_SNAP_THRESHOLD = 0.5

interface TrackpadState {
  isGesturing: boolean
  direction: 'next' | 'prev' | null
  progress: number
  velocity: number
  isCommitted: boolean
}

export function useTrackpadGesture(
  onGesture: TrackpadGestureCallback,
  wheelRange: number = 800,
) {
  const stateRef = useRef<TrackpadState>({
    isGesturing: false,
    direction: null,
    progress: 0,
    velocity: 0,
    isCommitted: false,
  })

  const timerRef = useRef<number | null>(null)
  const velocitySampleRef = useRef<{ ts: number; delta: number }>({ ts: 0, delta: 0 })
  const startAccumRef = useRef<{ sum: number; ts: number }>({ sum: 0, ts: 0 })
  const lastWheelTsRef = useRef(0)
  const logCountRef = useRef(0)

  const resetState = useCallback(() => {
    stateRef.current = {
      isGesturing: false,
      direction: null,
      progress: 0,
      velocity: 0,
      isCommitted: false,
    }
    velocitySampleRef.current = { ts: 0, delta: 0 }
    startAccumRef.current = { sum: 0, ts: 0 }
  }, [])

  const finalize = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const { progress, velocity, direction, isGesturing } = stateRef.current
    if (!isGesturing || !direction) {
      resetState()
      return
    }

    const shouldCommit = progress >= TRACKPAD_SNAP_THRESHOLD || velocity > TRACKPAD_FAST_VELOCITY_THRESHOLD
    console.log('[TRACKPAD] finalize:', { progress, velocity, direction, shouldCommit })
    onGesture(direction, progress, shouldCommit)
    resetState()
  }, [onGesture, resetState])

  const scheduleFinalize = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(finalize, TRACKPAD_FINALIZE_DELAY)
  }, [finalize])

  const handleWheelEvent = useCallback(
    (event: WheelEvent): boolean => {
      let deltaY = event.deltaY || 0
      if (event.deltaMode === 1) deltaY *= 16
      if (event.deltaMode === 2) deltaY *= window.innerHeight

      const now = performance.now()
      const wheelDt = now - lastWheelTsRef.current
      lastWheelTsRef.current = now

      // Detect if trackpad (smooth, small deltas, rapid fire)
      const isTrackpad =
        event.deltaMode === 0 &&
        (Math.abs(deltaY) < TRACKPAD_DELTA_CUTOFF || wheelDt < TRACKPAD_STREAM_CUTOFF_MS)

      logCountRef.current++
      if (logCountRef.current % 5 === 0) {
        console.log('[TRACKPAD_DETECT]', {
          deltaY,
          deltaMode: event.deltaMode,
          absDelta: Math.abs(deltaY),
          wheelDt,
          isTrackpad,
          cutoffs: { DELTA: TRACKPAD_DELTA_CUTOFF, STREAM: TRACKPAD_STREAM_CUTOFF_MS },
        })
      }

      if (!isTrackpad) {
        console.log('[TRACKPAD] not trackpad, resetting')
        resetState()
        return false
      }

      const absDelta = Math.abs(deltaY)
      const clampedDelta = Math.min(absDelta, 120)
      const direction = deltaY > 0 ? ('next' as const) : ('prev' as const)

      // VELOCITY CALCULATION
      const prevSample = velocitySampleRef.current
      if (prevSample.ts && now - prevSample.ts < TRACKPAD_VELOCITY_SAMPLE_WINDOW) {
        const dt = Math.max(1, now - prevSample.ts)
        const velocity = clampedDelta / dt
        // Exponential moving average
        stateRef.current.velocity = velocity * 0.7 + stateRef.current.velocity * 0.3
        velocitySampleRef.current = { ts: now, delta: clampedDelta }

        if (logCountRef.current % 10 === 0) {
          console.log('[TRACKPAD_VEL]', { velocity: velocity.toFixed(3), avg: stateRef.current.velocity.toFixed(3) })
        }
      } else {
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      }

      // START DETECTION - ignore tiny deltas at beginning
      if (!stateRef.current.isGesturing && clampedDelta < TRACKPAD_START_DELTA) {
        const lastAccum = startAccumRef.current
        if (!lastAccum.ts || now - lastAccum.ts > TRACKPAD_START_ACCUM_WINDOW) {
          startAccumRef.current = { sum: 0, ts: now }
        }
        startAccumRef.current.sum += clampedDelta

        if (startAccumRef.current.sum < TRACKPAD_START_DELTA) {
          console.log('[TRACKPAD_START] accumulating:', startAccumRef.current.sum)
          return true // consume event but don't update
        }
        // Threshold crossed, start gesture
        console.log('[TRACKPAD_START] threshold crossed, starting gesture')
        startAccumRef.current = { sum: 0, ts: 0 }
      } else {
        startAccumRef.current = { sum: 0, ts: 0 }
      }

      // NEW GESTURE
      if (!stateRef.current.isGesturing) {
        stateRef.current.isGesturing = true
        stateRef.current.direction = direction
        stateRef.current.progress = 0
        stateRef.current.velocity = 0
        stateRef.current.isCommitted = false
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
        console.log('[TRACKPAD] new gesture:', direction)
      }

      // DIRECTION CHANGE
      if (stateRef.current.direction !== direction) {
        console.log('[TRACKPAD] direction change:', stateRef.current.direction, '=>', direction)
        onGesture(stateRef.current.direction || direction, stateRef.current.progress, false)
        stateRef.current.direction = direction
        stateRef.current.progress = 0
        stateRef.current.velocity = 0
        stateRef.current.isCommitted = false
        velocitySampleRef.current = { ts: now, delta: clampedDelta }
      }

      // UPDATE PROGRESS
      const nextProgress = Math.min(1, stateRef.current.progress + clampedDelta / wheelRange)
      stateRef.current.progress = nextProgress

      // CHECK FOR FAST COMMIT (velocity high)
      const isFastSwipe = stateRef.current.velocity > TRACKPAD_FAST_VELOCITY_THRESHOLD
      const progressThresholdReached = nextProgress >= TRACKPAD_SNAP_THRESHOLD

      if ((isFastSwipe || progressThresholdReached) && !stateRef.current.isCommitted) {
        stateRef.current.isCommitted = true
        console.log('[TRACKPAD] COMMIT:', { isFastSwipe, velocity: stateRef.current.velocity.toFixed(3), progress: nextProgress })
        onGesture(direction, nextProgress, true)
        resetState()
        return true
      }

      // Publish progress update
      onGesture(direction, nextProgress, false)
      scheduleFinalize()
      return true
    },
    [wheelRange, onGesture, resetState, scheduleFinalize],
  )

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    resetState()
  }, [resetState])

  return {
    handleWheelEvent,
    cleanup,
    getState: () => stateRef.current,
  }
}
