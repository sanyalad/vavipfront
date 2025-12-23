/**
 * gesturePhysics.ts
 * 
 * Единый движок физики для жестов перелистывания.
 * Реализует dt-based интеграцию, iOS-like momentum, micro rubber-band и snap-пружину.
 * 
 * Архитектура:
 * - Машина состояний: idle → interacting → coasting → snapping → idle
 * - Semi-implicit Euler для стабильной интеграции
 * - Экспоненциальный decay для coast (friction)
 * - Критически демпфированная пружина для snap
 * - Нелинейный rubber-band на границах
 */

// ===== TYPES =====

export type GestureState = 'idle' | 'interacting' | 'coasting' | 'snapping'
export type GestureDirection = 'next' | 'prev' | null
export type InputSource = 'trackpad' | 'mouse' | 'touch' | null

export interface PhysicsConfig {
  // Coast (инерция после отпускания)
  coastFriction: number          // Коэффициент трения (0.92 = iOS-like)
  coastMinVelocity: number       // Минимальная скорость для продолжения coast (progress/ms)
  
  // Snap (пружина к 0/1)
  snapStiffness: number          // Жёсткость пружины (Hz²)
  snapDamping: number            // Демпфирование (ratio, 1.0 = critical)
  snapSettleThreshold: number    // Порог "прибытия" (progress)
  snapVelocityThreshold: number  // Порог скорости "покоя" (progress/ms)
  
  // Rubber-band на границах
  rubberBandMaxOverscroll: number // Максимальный overscroll (0.03 = 3%)
  rubberBandStiffness: number     // Жёсткость возврата
  
  // Commit/rollback решение
  commitThreshold: number         // Порог progress для commit
  velocityCommitBoost: number     // Множитель: высокая скорость снижает порог
  predictHorizonMs: number        // Горизонт предсказания для velocity-based решения
}

export interface GestureSnapshot {
  state: GestureState
  progress: number
  velocity: number
  direction: GestureDirection
  source: InputSource
  target: 0 | 1 | null
  isOverscrolling: boolean
  timestamp: number
}

export interface PhysicsEngineCallbacks {
  onProgressUpdate: (progress: number, velocity: number) => void
  onStateChange: (state: GestureState, prevState: GestureState) => void
  onCommit: (direction: GestureDirection) => void
  onRollback: () => void
}

// ===== DEFAULT CONFIGS =====

export const defaultTrackpadConfig: PhysicsConfig = {
  coastFriction: 0.94,           // Чуть меньше трения для iOS-feel
  coastMinVelocity: 0.00008,
  snapStiffness: 300,            // Hz², increased for faster, more responsive snap animation
  snapDamping: 0.98,             // Higher damping for smoother, faster settling
  snapSettleThreshold: 0.001,    // Stricter threshold for more precise completion
  snapVelocityThreshold: 0.00008, // Slightly higher threshold for faster completion
  rubberBandMaxOverscroll: 0.025, // 2.5%
  rubberBandStiffness: 200,
  commitThreshold: 0.25,
  velocityCommitBoost: 150,       // velocity * boost добавляется к progress для решения
  predictHorizonMs: 300,
}

export const defaultMouseConfig: PhysicsConfig = {
  coastFriction: 0.88,           // Больше трения, быстрее останавливается
  coastMinVelocity: 0.0001,
  snapStiffness: 250,
  snapDamping: 1.0,
  snapSettleThreshold: 0.003,
  snapVelocityThreshold: 0.0001,
  rubberBandMaxOverscroll: 0.015, // 1.5%
  rubberBandStiffness: 300,
  commitThreshold: 0.2,
  velocityCommitBoost: 100,
  predictHorizonMs: 200,
}

export const defaultTouchConfig: PhysicsConfig = {
  coastFriction: 0.93,
  coastMinVelocity: 0.0001,
  snapStiffness: 200,
  snapDamping: 0.95,              // Slight underdamping for "alive" feel
  snapSettleThreshold: 0.002,
  snapVelocityThreshold: 0.00008,
  rubberBandMaxOverscroll: 0.03,  // 3%
  rubberBandStiffness: 180,
  commitThreshold: 0.22,
  velocityCommitBoost: 180,
  predictHorizonMs: 350,
}

// ===== PHYSICS ENGINE =====

export class GesturePhysicsEngine {
  private state: GestureState = 'idle'
  private progress: number = 0
  private velocity: number = 0
  private direction: GestureDirection = null
  private source: InputSource = null
  private target: 0 | 1 | null = null
  
  private config: PhysicsConfig
  private callbacks: PhysicsEngineCallbacks
  
  private lastUpdateTs: number = 0
  private rafId: number | null = null
  
  // Velocity tracking для плавного расчёта
  private velocitySamples: { progress: number; ts: number }[] = []
  private readonly maxVelocitySamples = 8
  private readonly velocityWindowMs = 80
  
  // Track if delta should be inverted due to direction change
  // This allows progress to decrease smoothly when direction changes
  private deltaInverted: boolean = false
  private originalDirection: GestureDirection = null
  private lastDirectionChangeTs: number = 0
  
  // Debug/tracing
  private traceBuffer: GestureSnapshot[] = []
  private readonly maxTraceLength = 100
  public debugEnabled: boolean = false
  
  constructor(callbacks: PhysicsEngineCallbacks, config?: Partial<PhysicsConfig>) {
    this.callbacks = callbacks
    this.config = { ...defaultTrackpadConfig, ...config }
  }
  
  // ===== PUBLIC API =====
  
  /** Начать или продолжить жест с новым delta */
  public input(delta: number, direction: GestureDirection, source: InputSource): void {
    // #region agent log
    // Reduced logging frequency to improve performance
    if (Math.random() < 0.02) { // Log only 2% of calls
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:138',message:'input() called',data:{delta,direction,source,currentState:this.state,currentProgress:this.progress,currentVelocity:this.velocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    }
    // #endregion
    
    // CRITICAL FIX: Only start new gesture from idle state
    // During snapping, we should ignore input to let the animation complete
    // This prevents interrupting the snap animation with new gestures
    if (this.state === 'idle') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:140',message:'Starting new gesture from input()',data:{state:this.state,direction,source},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      this.startGesture(direction, source)
    } else if (this.state === 'snapping') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:147',message:'input() IGNORED - snapping in progress',data:{state:this.state,direction,source,progress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return // Ignore input during snap animation
    }
    // If state is 'interacting' or 'coasting', continue the gesture (don't return)
    
    // Если направление изменилось, установить флаг инверсии delta
    // CRITICAL: Инвертируем знак delta при смене направления и продолжаем инвертировать для всех последующих событий
    // Это позволяет progress естественно уменьшаться, создавая эффект плавного движения обратно
    // CRITICAL FIX: При быстром скролле с частой сменой направления, сбрасываем флаг инверсии
    // чтобы избежать путаницы и неправильного поведения
    const now = performance.now()
    const timeSinceLastDirectionChange = now - (this.lastDirectionChangeTs || 0)
    const isFastDirectionChange = timeSinceLastDirectionChange < 50 // Less than 50ms = fast change
    
    if (this.direction !== direction && this.direction !== null) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:160',message:'Direction changed, setting deltaInverted flag',data:{oldDirection:this.direction,newDirection:direction,currentProgress:this.progress,delta,originalDirection:this.originalDirection,timeSinceLastDirectionChange,isFastDirectionChange},timestamp:Date.now(),sessionId:'debug-session',runId:'run30',hypothesisId:'AQ'})}).catch(()=>{});
      // #endregion
      
      // If direction changes too fast, reset inversion flag to avoid confusion
      // This prevents issues during rapid scrolling where direction changes frequently
      if (isFastDirectionChange && this.deltaInverted) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:175',message:'Fast direction change detected, resetting deltaInverted flag',data:{oldDirection:this.direction,newDirection:direction,timeSinceLastDirectionChange},timestamp:Date.now(),sessionId:'debug-session',runId:'run30',hypothesisId:'AQ'})}).catch(()=>{});
        // #endregion
        this.deltaInverted = false
        this.originalDirection = direction
      } else {
        // Set flag to invert delta for all subsequent events until direction returns to original
        this.deltaInverted = true
        this.originalDirection = this.direction // Store original direction
      }
      
      this.lastDirectionChangeTs = now
      // Reset velocity to prevent momentum from carrying over in wrong direction
      this.velocity = 0
      // Clear velocity samples to start fresh
      this.velocitySamples = []
      // CRITICAL FIX: Reset target when direction changes to prevent incorrect commit
      // When direction changes, we want to rollback (target = 0), not commit
      // This prevents the section from switching when user changes scroll direction
      this.target = 0
      this.direction = direction
    } else if (this.direction === null) {
      // First gesture, set direction and reset inversion flag
      this.direction = direction
      this.originalDirection = direction
      this.deltaInverted = false
      this.lastDirectionChangeTs = now
    } else if (this.direction === this.originalDirection && this.deltaInverted) {
      // Direction returned to original, reset inversion flag
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:178',message:'Direction returned to original, resetting deltaInverted flag',data:{direction,originalDirection:this.originalDirection,currentProgress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run27',hypothesisId:'AN'})}).catch(()=>{});
      // #endregion
      this.deltaInverted = false
      this.originalDirection = direction
      this.lastDirectionChangeTs = now
    }
    
    // CRITICAL: Only invert delta if direction is different from original AND deltaInverted flag is set
    // If direction has changed back to original, don't invert delta anymore
    const effectiveDelta = (this.deltaInverted && this.direction !== this.originalDirection) ? -delta : delta
    // #region agent log
    if (this.deltaInverted) {
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:194',message:'Delta inverted due to direction change',data:{delta,effectiveDelta,deltaInverted:this.deltaInverted,currentDirection:this.direction,originalDirection:this.originalDirection,currentProgress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run28',hypothesisId:'AO'})}).catch(()=>{});
    }
    // #endregion
    
    // Применить delta с учётом rubber-band на границах
    // Use effectiveDelta which may be inverted if direction changed
    const rawProgress = this.progress + effectiveDelta
    const prevProgress = this.progress
    this.progress = this.applyRubberBand(rawProgress)
    // #region agent log
    if (this.deltaInverted || Math.abs(effectiveDelta - delta) > 0.0001) {
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:201',message:'Progress updated with inverted delta',data:{delta,effectiveDelta,prevProgress,newProgress:this.progress,deltaInverted:this.deltaInverted,currentDirection:this.direction,originalDirection:this.originalDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'run29',hypothesisId:'AP'})}).catch(()=>{});
    }
    // #endregion
    
    // Трекинг velocity
    this.addVelocitySample(this.progress, now)
    this.velocity = this.calculateVelocity(now)
    
    this.lastUpdateTs = now
    this.emitProgress()
    this.trace()
  }
  
  /** Отпустить жест (палец/колесо затихло) */
  public release(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:167',message:'release() called',data:{state:this.state,progress:this.progress,velocity:this.velocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // CRITICAL FIX: Allow release() in both 'interacting' and 'coasting' states
    // If we're coasting, we should still be able to transition to snapping
    // This prevents sections from getting stuck when the timer fires during coasting
    if (this.state !== 'interacting' && this.state !== 'coasting') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:170',message:'release() SKIPPED - state not interacting or coasting',data:{state:this.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return
    }
    
    // CRITICAL FIX: If we're already coasting, force transition to snapping
    // This prevents infinite coasting loops when release() is called multiple times
    // The timer should finalize the gesture, not keep it coasting
    if (this.state === 'coasting') {
      this.stopAnimation()
      const now = performance.now()
      this.velocity = this.calculateVelocity(now)
      
      // Determine target based on current progress and direction
      if (this.deltaInverted) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:260',message:'release() from coasting - direction changed, forcing target to 0',data:{deltaInverted:this.deltaInverted,originalDirection:this.originalDirection,currentDirection:this.direction,progress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run34',hypothesisId:'AU'})}).catch(()=>{});
        // #endregion
        this.target = 0
      } else {
        const predicted = this.predictFinalProgress()
        this.target = predicted >= this.config.commitThreshold ? 1 : 0
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:198',message:'release() from coasting -> snapping',data:{progress:this.progress,velocity:this.velocity,target:this.target},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.transitionTo('snapping')
      this.startSnapAnimation()
      return
    }
    
    const now = performance.now()
    this.velocity = this.calculateVelocity(now)
    
    // CRITICAL FIX: If direction was changed during gesture (deltaInverted is true),
    // force target to 0 to prevent incorrect commit when user changes scroll direction
    // This ensures the section rolls back smoothly instead of switching
    if (this.deltaInverted) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:260',message:'release() - direction changed, forcing target to 0',data:{deltaInverted:this.deltaInverted,originalDirection:this.originalDirection,currentDirection:this.direction,progress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run34',hypothesisId:'AU'})}).catch(()=>{});
      // #endregion
      this.target = 0
    } else {
      // Определить target (0 или 1) на основе progress + velocity
      const predicted = this.predictFinalProgress()
      this.target = predicted >= this.config.commitThreshold ? 1 : 0
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:180',message:'release() calculating target',data:{predicted:this.deltaInverted ? 'N/A (direction changed)' : this.predictFinalProgress(),target:this.target,progress:this.progress,velocity:this.velocity,deltaInverted:this.deltaInverted},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Если уже за границами, сразу в snap
    if (this.progress < 0 || this.progress > 1) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:185',message:'release() -> snapping (overscroll)',data:{progress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.transitionTo('snapping')
      this.startSnapAnimation()
      return
    }
    
    // Если есть достаточная скорость, coast
    if (Math.abs(this.velocity) > this.config.coastMinVelocity) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:193',message:'release() -> coasting',data:{velocity:this.velocity,coastMinVelocity:this.config.coastMinVelocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.transitionTo('coasting')
      this.startCoastAnimation()
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:198',message:'release() -> snapping (low velocity)',data:{velocity:this.velocity,coastMinVelocity:this.config.coastMinVelocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Иначе сразу snap
      this.transitionTo('snapping')
      this.startSnapAnimation()
    }
  }
  
  /** Принудительно сбросить к idle */
  public reset(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:196',message:'reset() called',data:{prevState:this.state,progress:this.progress,velocity:this.velocity,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    this.stopAnimation()
    const prevState = this.state
    this.state = 'idle'
    this.progress = 0
    this.velocity = 0
    this.direction = null
    this.source = null
    this.target = null
    this.velocitySamples = []
    this.lastUpdateTs = 0
    this.lastEmittedProgress = -1 // Reset emitted progress tracking
    // Reset delta inversion flags
    this.deltaInverted = false
    this.originalDirection = null
    this.lastDirectionChangeTs = 0 // Reset direction change timestamp
    
    if (prevState !== 'idle') {
      this.callbacks.onStateChange('idle', prevState)
    }
    this.emitProgress()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:212',message:'reset() completed',data:{state:this.state,progress:this.progress,velocity:this.velocity,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }
  
  /** Получить текущий snapshot */
  public getSnapshot(): GestureSnapshot {
    return {
      state: this.state,
      progress: this.progress,
      velocity: this.velocity,
      direction: this.direction,
      source: this.source,
      target: this.target,
      isOverscrolling: this.progress < 0 || this.progress > 1,
      timestamp: performance.now(),
    }
  }
  
  /** Сменить конфиг (например, при смене input source) */
  public setConfig(source: InputSource): void {
    this.source = source
    switch (source) {
      case 'trackpad':
        this.config = { ...defaultTrackpadConfig }
        break
      case 'mouse':
        this.config = { ...defaultMouseConfig }
        break
      case 'touch':
        this.config = { ...defaultTouchConfig }
        break
    }
  }
  
  /** Получить trace для отладки */
  public getTrace(): GestureSnapshot[] {
    return [...this.traceBuffer]
  }
  
  /** Очистить trace */
  public clearTrace(): void {
    this.traceBuffer = []
  }
  
  // ===== PRIVATE: State transitions =====
  
  private startGesture(direction: GestureDirection, source: InputSource): void {
    this.stopAnimation()
    this.direction = direction
    this.source = source
    this.progress = 0
    this.velocity = 0
    this.velocitySamples = []
    const now = performance.now()
    this.lastUpdateTs = now
    this.setConfig(source)
    // Reset delta inversion flags for new gesture
    this.deltaInverted = false
    this.originalDirection = direction
    this.lastDirectionChangeTs = now // Initialize direction change timestamp
    this.transitionTo('interacting')
  }
  
  private transitionTo(newState: GestureState): void {
    const prevState = this.state
    if (prevState === newState) return
    this.state = newState
    this.callbacks.onStateChange(newState, prevState)
    this.trace()
  }
  
  // ===== PRIVATE: Animations =====
  
  private startCoastAnimation(): void {
    this.stopAnimation()
    
    const animate = (now: number) => {
      if (this.state !== 'coasting') return
      
      const dt = Math.min(32, now - this.lastUpdateTs) // Cap dt для стабильности
      if (dt <= 0) {
        this.rafId = requestAnimationFrame(animate)
        return
      }
      
      // Exponential decay: v *= friction^(dt/16.67)
      const frictionFactor = Math.pow(this.config.coastFriction, dt / 16.67)
      this.velocity *= frictionFactor
      
      // Semi-implicit Euler: сначала обновляем velocity, потом position
      const rawProgress = this.progress + this.velocity * dt
      this.progress = this.applyRubberBand(rawProgress)
      
      this.lastUpdateTs = now
      this.emitProgress()
      this.trace()
      
      // Условия остановки coast
      const isAtRest = Math.abs(this.velocity) < this.config.coastMinVelocity
      const hitBoundary = this.progress <= 0 || this.progress >= 1
      const overscrolled = this.progress < -this.config.rubberBandMaxOverscroll || 
                           this.progress > 1 + this.config.rubberBandMaxOverscroll
      
      if (isAtRest || hitBoundary || overscrolled) {
        // Пересчитать target на основе текущего progress
        this.target = this.progress >= this.config.commitThreshold ? 1 : 0
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:469',message:'Coast animation settling - transitioning to snapping',data:{progress:this.progress,velocity:this.velocity,isAtRest,hitBoundary,overscrolled,target:this.target,currentState:this.state,rafId:this.rafId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        // CRITICAL: Stop coast animation BEFORE transitioning to snapping
        // This ensures the RAF loop is stopped before starting snap animation
        this.stopAnimation()
        this.transitionTo('snapping')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:476',message:'Coast animation stopped, calling startSnapAnimation',data:{progress:this.progress,velocity:this.velocity,target:this.target,state:this.state,rafId:this.rafId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        this.startSnapAnimation()
        return
      }
      
      this.rafId = requestAnimationFrame(animate)
    }
    
    this.lastUpdateTs = performance.now()
    this.rafId = requestAnimationFrame(animate)
  }
  
  private startSnapAnimation(): void {
    // CRITICAL: Always stop any existing animation first
    // This ensures clean state before starting snap animation
    this.stopAnimation()
    
    // CRITICAL: If we're not in snapping state, don't start snap animation
    // This prevents starting snap animation from wrong state
    if (this.state !== 'snapping') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:492',message:'startSnapAnimation() SKIPPED - state not snapping',data:{state:this.state,progress:this.progress,velocity:this.velocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'S'})}).catch(()=>{});
      // #endregion
      return
    }
    
    if (this.target === null) {
      this.target = this.progress >= this.config.commitThreshold ? 1 : 0
    }
    
    const targetValue = this.target
    const { snapStiffness, snapDamping, snapSettleThreshold, snapVelocityThreshold } = this.config
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:380',message:'startSnapAnimation() called',data:{targetValue,progress:this.progress,velocity:this.velocity,snapSettleThreshold,snapVelocityThreshold,state:this.state,rafId:this.rafId},timestamp:Date.now(),sessionId:'debug-session',runId:'run9',hypothesisId:'S'})}).catch(()=>{});
    // #endregion
    
    // CRITICAL: Add timeout to prevent snap animation from getting stuck forever
    // If animation doesn't complete within reasonable time, force completion
    const snapStartTime = performance.now()
    const SNAP_TIMEOUT_MS = 2000 // 2 seconds max for snap animation
    
    // Критически демпфированная пружина: omega = sqrt(stiffness)
    const omega = Math.sqrt(snapStiffness)
    const dampingRatio = snapDamping
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:520',message:'startSnapAnimation() - about to start RAF',data:{targetValue,progress:this.progress,velocity:this.velocity,state:this.state,rafId:this.rafId},timestamp:Date.now(),sessionId:'debug-session',runId:'run39',hypothesisId:'AZ'})}).catch(()=>{});
    // #endregion
    
    const animate = (now: number) => {
      // #region agent log
      // Log first few frames to track if animation is running
      if (Math.random() < 0.3) { // Log 30% of frames to track progress
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:528',message:'Snap animation frame',data:{state:this.state,targetValue,progress:this.progress,velocity:this.velocity,rafId:this.rafId},timestamp:Date.now(),sessionId:'debug-session',runId:'run38',hypothesisId:'AY'})}).catch(()=>{});
      }
      // #endregion
      
      if (this.state !== 'snapping') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:464',message:'Snap animation stopped - state changed',data:{state:this.state,targetValue,progress:this.progress},timestamp:Date.now(),sessionId:'debug-session',runId:'run33',hypothesisId:'AT'})}).catch(()=>{});
        // #endregion
        return
      }
      
      // CRITICAL: Timeout check - force completion if animation takes too long
      const elapsed = now - snapStartTime
      if (elapsed > SNAP_TIMEOUT_MS) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:470',message:'Snap animation TIMEOUT - forcing completion',data:{elapsed,targetValue,progress:this.progress,velocity:this.velocity},timestamp:Date.now(),sessionId:'debug-session',runId:'run37',hypothesisId:'AX'})}).catch(()=>{});
        // #endregion
        this.progress = targetValue
        this.velocity = 0
        this.emitProgress()
        const commitDirection = this.direction
        this.transitionTo('idle')
        this.direction = null
        this.source = null
        this.target = null
        if (targetValue === 1) {
          this.callbacks.onCommit(commitDirection)
        } else {
          this.callbacks.onRollback()
        }
        return
      }
      
      const dt = Math.min(32, now - this.lastUpdateTs) / 1000 // в секундах для физики
      if (dt <= 0) {
        this.rafId = requestAnimationFrame(animate)
        return
      }
      
      // Расстояние до цели
      const displacement = this.progress - targetValue
      
      // Critically damped spring: a = -2*damping*omega*v - omega²*x
      const springForce = -omega * omega * displacement
      const dampingForce = -2 * dampingRatio * omega * (this.velocity * 1000) // velocity в progress/s
      const acceleration = springForce + dampingForce
      
      // Semi-implicit Euler
      const prevProgress = this.progress
      const prevVelocity = this.velocity
      this.velocity = (this.velocity * 1000 + acceleration * dt) / 1000 // обратно в progress/ms
      this.progress += this.velocity * dt * 1000
      
      this.lastUpdateTs = now
      this.emitProgress()
      this.trace()
      
      // Условие settle
      const distanceToTarget = Math.abs(this.progress - targetValue)
      const velocityLow = Math.abs(this.velocity) < snapVelocityThreshold
      
      // #region agent log
      // Log every 10th frame to track progress
      if (Math.random() < 0.1 || distanceToTarget < snapSettleThreshold * 2) {
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:406',message:'Snap animation tick',data:{progress:this.progress,prevProgress,targetValue,distanceToTarget,velocity:this.velocity,prevVelocity,velocityLow,snapSettleThreshold,snapVelocityThreshold,dt,displacement,springForce,dampingForce,acceleration},timestamp:Date.now(),sessionId:'debug-session',runId:'run33',hypothesisId:'AT'})}).catch(()=>{});
      }
      // #endregion
      
      // CRITICAL: Use strict settling conditions to ensure animation completes fully
      // Only settle when very close to target AND velocity is very low
      // This ensures smooth, complete animations without premature termination
      const isSettled = distanceToTarget < snapSettleThreshold && velocityLow
      // Only use "very close" as fallback if extremely close (within 1.5x threshold) AND velocity is very low
      // This prevents premature completion while still allowing natural settling
      const isVeryClose = distanceToTarget < snapSettleThreshold * 1.2 && Math.abs(this.velocity) < snapVelocityThreshold * 1.5
      
      if (isSettled || isVeryClose) {
        // Финализация
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:415',message:'Snap animation settling - finalizing',data:{targetValue,progress:this.progress,velocity:this.velocity,distanceToTarget,isSettled,isVeryClose},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        this.progress = targetValue
        this.velocity = 0
        this.emitProgress()
        
        // CRITICAL: Transition to idle FIRST, then call callbacks
        // This ensures the engine is in idle state before callbacks can cause re-renders
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:425',message:'Snap animation completed, transitioning to idle BEFORE callbacks',data:{targetValue,progress:this.progress,velocity:this.velocity,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const commitDirection = this.direction // Save direction before clearing
        this.transitionTo('idle')
        this.direction = null
        this.source = null
        this.target = null
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:432',message:'State reset after idle transition',data:{state:this.state,progress:this.progress,velocity:this.velocity,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Now call callbacks AFTER transitioning to idle
        // This ensures callbacks can't interrupt the idle transition
        if (targetValue === 1) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:437',message:'Calling onCommit AFTER idle transition',data:{direction:commitDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          this.callbacks.onCommit(commitDirection)
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:441',message:'Calling onRollback AFTER idle transition',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          this.callbacks.onRollback()
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4fe65748-5bf6-42a4-999b-e7fdbb89bc2e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gesturePhysics.ts:445',message:'Callbacks completed, snap animation fully finished',data:{state:this.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return
      }
      
      this.rafId = requestAnimationFrame(animate)
    }
    
    this.lastUpdateTs = performance.now()
    this.rafId = requestAnimationFrame(animate)
  }
  
  private stopAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
  
  // ===== PRIVATE: Physics helpers =====
  
  /** Нелинейный rubber-band: чем дальше за границу, тем меньше прирост */
  private applyRubberBand(rawProgress: number): number {
    const maxOver = this.config.rubberBandMaxOverscroll
    
    if (rawProgress < 0) {
      // За нижней границей
      const over = -rawProgress
      // Формула iOS-style: x / (1 + x/max)
      const dampedOver = over / (1 + over / maxOver)
      return -Math.min(dampedOver, maxOver)
    }
    
    if (rawProgress > 1) {
      // За верхней границей
      const over = rawProgress - 1
      const dampedOver = over / (1 + over / maxOver)
      return 1 + Math.min(dampedOver, maxOver)
    }
    
    return rawProgress
  }
  
  private addVelocitySample(progress: number, ts: number): void {
    this.velocitySamples.push({ progress, ts })
    
    // Ограничить размер
    if (this.velocitySamples.length > this.maxVelocitySamples) {
      this.velocitySamples = this.velocitySamples.slice(-this.maxVelocitySamples)
    }
    
    // Удалить старые
    this.velocitySamples = this.velocitySamples.filter(
      s => ts - s.ts < this.velocityWindowMs * 2
    )
  }
  
  private calculateVelocity(now: number): number {
    const samples = this.velocitySamples.filter(
      s => now - s.ts < this.velocityWindowMs
    )
    
    if (samples.length < 2) return this.velocity
    
    const first = samples[0]
    const last = samples[samples.length - 1]
    const dt = last.ts - first.ts
    
    if (dt <= 0) return this.velocity
    
    return (last.progress - first.progress) / dt
  }
  
  /** Предсказать финальный progress с учётом velocity и friction */
  private predictFinalProgress(): number {
    const { coastFriction, predictHorizonMs, velocityCommitBoost } = this.config
    
    // Простая модель: интегрируем velocity с friction на predictHorizonMs
    let predicted = this.progress
    let v = this.velocity
    let remaining = predictHorizonMs
    const step = 16.67
    
    while (remaining > 0 && Math.abs(v) > 0.00001) {
      const dt = Math.min(step, remaining)
      v *= Math.pow(coastFriction, dt / 16.67)
      predicted += v * dt
      remaining -= dt
    }
    
    // Добавить velocity boost для решения
    const velocityBonus = this.velocity * velocityCommitBoost
    
    return predicted + velocityBonus
  }
  
  // ===== PRIVATE: Callbacks & tracing =====
  
  private lastEmittedProgress: number = -1 // Track last emitted value to avoid redundant updates
  
  private emitProgress(): void {
    // Optimize: Only emit if progress actually changed significantly
    // This reduces unnecessary CSS var updates during snap animation
    const progressDiff = Math.abs(this.progress - this.lastEmittedProgress)
    if (this.state === 'snapping') {
      // During snap animation, only emit if change is significant (>0.2%)
      if (progressDiff < 0.002) {
        return
      }
    } else {
      // During interacting/coasting, emit if change is significant (>0.5%)
      // This reduces updates during fast scrolling
      if (progressDiff < 0.005) {
        return
      }
    }
    
    this.lastEmittedProgress = this.progress
    this.callbacks.onProgressUpdate(this.progress, this.velocity)
  }
  
  private trace(): void {
    if (!this.debugEnabled) return
    
    this.traceBuffer.push(this.getSnapshot())
    
    if (this.traceBuffer.length > this.maxTraceLength) {
      this.traceBuffer = this.traceBuffer.slice(-this.maxTraceLength)
    }
  }
}

// ===== DEBUG OVERLAY COMPONENT =====

export interface DebugOverlayData {
  state: GestureState
  progress: number
  velocity: number
  direction: GestureDirection
  source: InputSource
  target: 0 | 1 | null
  isOverscrolling: boolean
  lastEvent: string
  fps: number
}

/**
 * Создаёт DOM-элемент для debug overlay
 * Использовать как: const overlay = createDebugOverlay(); document.body.appendChild(overlay.element)
 */
export function createDebugOverlay() {
  const element = document.createElement('div')
  element.id = 'gesture-debug-overlay'
  element.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 99999;
    background: rgba(0, 0, 0, 0.85);
    color: #0f0;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    padding: 12px 16px;
    border-radius: 8px;
    pointer-events: none;
    min-width: 220px;
    line-height: 1.6;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 255, 0, 0.2);
  `
  
  let lastFrameTs = performance.now()
  let frameCount = 0
  let fps = 60
  
  const update = (data: Partial<DebugOverlayData>) => {
    // FPS calculation
    const now = performance.now()
    frameCount++
    if (now - lastFrameTs >= 500) {
      fps = Math.round(frameCount / ((now - lastFrameTs) / 1000))
      frameCount = 0
      lastFrameTs = now
    }
    
    const stateColors: Record<GestureState, string> = {
      idle: '#888',
      interacting: '#0f0',
      coasting: '#ff0',
      snapping: '#f80',
    }
    
    const stateColor = stateColors[data.state || 'idle']
    const progressPercent = ((data.progress || 0) * 100).toFixed(1)
    const velocityDisplay = ((data.velocity || 0) * 1000).toFixed(2)
    const overscrollIndicator = data.isOverscrolling ? ' ⚠️' : ''
    
    element.innerHTML = `
      <div style="color: ${stateColor}; font-weight: bold; margin-bottom: 4px;">
        ● ${(data.state || 'idle').toUpperCase()}${overscrollIndicator}
      </div>
      <div>progress: <span style="color: #fff">${progressPercent}%</span></div>
      <div>velocity: <span style="color: #fff">${velocityDisplay}</span> ‰/s</div>
      <div>direction: <span style="color: #fff">${data.direction || '—'}</span></div>
      <div>source: <span style="color: #fff">${data.source || '—'}</span></div>
      <div>target: <span style="color: #fff">${data.target ?? '—'}</span></div>
      <div style="margin-top: 4px; color: #666;">
        ${data.lastEvent || ''} | ${fps} fps
      </div>
    `
  }
  
  return { element, update }
}

