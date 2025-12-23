/**
 * useGesturePhysics.ts
 * 
 * React-хук для интеграции GesturePhysicsEngine в компоненты.
 * Обеспечивает:
 * - Создание и lifecycle движка
 * - Прямое обновление CSS vars через ref (минимум re-renders)
 * - Debug overlay при ?debugGestures=1
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import {
  GesturePhysicsEngine,
  GestureState,
  GestureDirection,
  InputSource,
  GestureSnapshot,
  createDebugOverlay,
  PhysicsConfig,
  defaultTrackpadConfig,
  defaultMouseConfig,
  defaultTouchConfig,
} from '@/utils/gesturePhysics'

export interface UseGesturePhysicsOptions {
  /** Ref к DOM-элементу, на котором обновлять --gesture-progress */
  wrapperRef: React.RefObject<HTMLElement>
  
  /** Callback при commit (переход к следующей/предыдущей секции) */
  onCommit: (direction: GestureDirection) => void
  
  /** Callback при rollback (возврат на текущую секцию) */
  onRollback: () => void
  
  /** Callback при изменении state (для data-gesture и т.п.) */
  onStateChange?: (state: GestureState, prevState: GestureState) => void
  
  /** Включить debug overlay (по умолчанию проверяет ?debugGestures=1) */
  debug?: boolean
  
  /**
   * Обновлять React-state progress на каждом тике физики.
   * По умолчанию выключено (движение идёт через CSS vars напрямую без re-render).
   */
  updateReactProgressState?: boolean
  
  /** Кастомные настройки физики */
  configOverrides?: Partial<PhysicsConfig>
}

export interface UseGesturePhysicsReturn {
  /** Подать input (delta в progress units, 0..1 range) */
  input: (delta: number, direction: GestureDirection, source: InputSource) => void
  
  /** Отпустить жест (начать coast/snap) */
  release: () => void
  
  /** Сбросить к idle */
  reset: () => void
  
  /** Текущее состояние */
  state: GestureState
  
  /** Текущий progress (для React state, если нужен) */
  progress: number
  
  /** Текущее направление */
  direction: GestureDirection
  
  /** Получить полный snapshot */
  getSnapshot: () => GestureSnapshot
  
  /** Сменить конфиг на основе input source */
  setSource: (source: InputSource) => void
  
  /** Ref к движку для продвинутого использования */
  engineRef: React.RefObject<GesturePhysicsEngine | null>
}

export function useGesturePhysics(options: UseGesturePhysicsOptions): UseGesturePhysicsReturn {
  const { wrapperRef, onCommit, onRollback, onStateChange, debug, configOverrides, updateReactProgressState } = options


  const engineRef = useRef<GesturePhysicsEngine | null>(null)
  const debugOverlayRef = useRef<{ element: HTMLElement; update: (data: any) => void } | null>(null)
  const lastEventRef = useRef<string>('')
  
  // React state для компонентов, которым нужен re-render
  const [state, setState] = useState<GestureState>('idle')
  const [progress, setProgress] = useState(0) // optional: only updated when updateReactProgressState=true or debug
  const [direction, setDirection] = useState<GestureDirection>(null)
  
  // Определить, нужен ли debug
  const shouldDebug = debug ?? (typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debugGestures') === '1')
  
  // RAF batching для оптимизации обновлений CSS vars
  const pendingProgressRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)
  
  const flushProgressUpdate = useCallback(() => {
    if (pendingProgressRef.current === null) return
    
    const wrapper = wrapperRef.current
    if (wrapper) {
      const dataGesture = wrapper.getAttribute('data-gesture')
      // Only update if gesture is still active
      if (dataGesture === 'true') {
        const capped = Math.max(-0.06, Math.min(1.06, pendingProgressRef.current))
        wrapper.style.setProperty('--gesture-progress', String(capped))
      }
    }
    
    pendingProgressRef.current = null
    rafIdRef.current = null
  }, [])
  
  // Инициализация движка
  useEffect(() => {
    const engine = new GesturePhysicsEngine(
      {
        onProgressUpdate: (prog, velocity) => {
          // Batch CSS var updates via RAF for better performance
          // This prevents excessive DOM updates during fast animations
          pendingProgressRef.current = prog
          
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushProgressUpdate)
          }
          
          // Обновить React state только если явно включено или нужен debug
          if (updateReactProgressState || shouldDebug) {
            setProgress(prog)
          }
          
          // Debug overlay
          if (debugOverlayRef.current) {
            debugOverlayRef.current.update({
              state: engine.getSnapshot().state,
              progress: prog,
              velocity,
              direction: engine.getSnapshot().direction,
              source: engine.getSnapshot().source,
              target: engine.getSnapshot().target,
              isOverscrolling: prog < 0 || prog > 1,
              lastEvent: lastEventRef.current,
            })
          }
        },
        
        onStateChange: (newState, prevState) => {
          setState(newState)

          // CRITICAL FIX: Sync data-gesture with physics state to prevent blocking
          // When physics state is 'interacting' or 'snapping', gesture is active
          // When physics state is 'idle', we DON'T immediately set data-gesture="false"
          // for trackpad, as finalizeTrackpadGesture will handle it after snap animation completes
          const wrapper = wrapperRef.current
          if (wrapper) {
            const shouldBeActive = newState === 'interacting' || newState === 'snapping'
            if (shouldBeActive) {
              // Always set to 'true' when active
              wrapper.setAttribute('data-gesture', 'true')
            }
            // DON'T set to 'false' on idle - let finalizeTrackpadGesture handle it
            // This allows snap animation to complete naturally without interruption
          }

          lastEventRef.current = `${prevState} → ${newState}`
          onStateChange?.(newState, prevState)
        },
        
        onCommit: (dir) => {
          lastEventRef.current = `COMMIT ${dir}`
          onCommit(dir)
        },
        
        onRollback: () => {
          lastEventRef.current = 'ROLLBACK'
          onRollback()
        },
      },
      configOverrides
    )
    
    engine.debugEnabled = shouldDebug
    engineRef.current = engine
    
    // Initialize CSS var so wrapper doesn't depend on React prop style.
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty('--gesture-progress', '0')
    }
    
    // Создать debug overlay
    if (shouldDebug && typeof document !== 'undefined') {
      const overlay = createDebugOverlay()
      document.body.appendChild(overlay.element)
      debugOverlayRef.current = overlay
      // render initial state immediately
      overlay.update({
        state: 'idle',
        progress: 0,
        velocity: 0,
        direction: null,
        source: null,
        target: null,
        isOverscrolling: false,
        lastEvent: 'init',
      })
    }
    
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      engine.reset()
      
      // Удалить debug overlay
      if (debugOverlayRef.current) {
        debugOverlayRef.current.element.remove()
        debugOverlayRef.current = null
      }
    }
  }, [flushProgressUpdate]) // Зависимости включают flushProgressUpdate
  
  // Обновить callbacks при изменении (без пересоздания движка)
  useEffect(() => {
    // Callbacks уже замкнуты в closure при создании движка
    // Для hot-reload можно добавить механизм обновления, но пока не критично
  }, [onCommit, onRollback, onStateChange])
  
  // API методы
  const input = useCallback((delta: number, dir: GestureDirection, source: InputSource) => {
    const engine = engineRef.current
    if (!engine) return
    
    engine.input(delta, dir, source)
    setDirection(dir)
    lastEventRef.current = `input ${dir} Δ${(delta * 100).toFixed(1)}%`
  }, [])
  
  const release = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    
    engine.release()
    lastEventRef.current = 'release'
  }, [])
  
  const reset = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    
    engine.reset()
    setDirection(null)
    lastEventRef.current = 'reset'
  }, [])
  
  const getSnapshot = useCallback((): GestureSnapshot => {
    const engine = engineRef.current
    if (!engine) {
      return {
        state: 'idle',
        progress: 0,
        velocity: 0,
        direction: null,
        source: null,
        target: null,
        isOverscrolling: false,
        timestamp: performance.now(),
      }
    }
    return engine.getSnapshot()
  }, [])
  
  const setSource = useCallback((source: InputSource) => {
    const engine = engineRef.current
    if (!engine) return
    engine.setConfig(source)
  }, [])
  
  return {
    input,
    release,
    reset,
    state,
    progress,
    direction,
    getSnapshot,
    setSource,
    engineRef,
  }
}

// ===== UTILITY: Wheel range calculation =====

export function calculateWheelRange(source: InputSource, viewportHeight: number): number {
  switch (source) {
    case 'trackpad':
      return Math.min(400, Math.max(180, viewportHeight * 0.5))
    case 'mouse':
      return 600
    case 'touch':
      return Math.min(450, Math.max(180, viewportHeight * 0.45))
    default:
      return 400
  }
}

// ===== UTILITY: Detect input source from wheel event =====

export function detectInputSource(
  event: WheelEvent,
  lastWheelTs: number,
  trackpadDeltaCutoff: number = 85,
  trackpadStreamCutoffMs: number = 180
): InputSource {
  const deltaY = event.deltaY
  const now = performance.now()
  const wheelDt = now - lastWheelTs
  
  const isLikelyTrackpad =
    event.deltaMode === 0 &&
    (Math.abs(deltaY) < trackpadDeltaCutoff || wheelDt < trackpadStreamCutoffMs)
  
  return isLikelyTrackpad ? 'trackpad' : 'mouse'
}

// Re-export configs for convenience
export { defaultTrackpadConfig, defaultMouseConfig, defaultTouchConfig }

