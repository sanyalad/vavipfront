/**
 * Утилиты для мониторинга производительности анимаций
 * Используются только в development режиме
 */

/**
 * FPS Monitor - мониторинг кадров в секунду
 * Показывает предупреждение если FPS < 55
 */
export function startFPSMonitor() {
  if (import.meta.env.MODE === 'production') return

  let lastTime = performance.now()
  let frameCount = 0
  let fps = 60

  function checkFPS() {
    frameCount++
    const currentTime = performance.now()
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
      
      if (fps < 55) {
        console.warn(`⚠️ Low FPS detected: ${fps}`)
      }
      
      frameCount = 0
      lastTime = currentTime
    }
    
    requestAnimationFrame(checkFPS)
  }
  
  requestAnimationFrame(checkFPS)
  
  // Возвращаем функцию для получения текущего FPS
  return () => fps
}

/**
 * Layout Shift Monitor - мониторинг layout shifts
 */
export function startLayoutShiftMonitor() {
  if (import.meta.env.MODE === 'production') return
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // @ts-expect-error - CLS entry type
        if (entry.value > 0.1) {
          console.warn('⚠️ Large layout shift detected:', entry)
        }
      }
    })
    
    observer.observe({ type: 'layout-shift', buffered: true })
    
    return () => observer.disconnect()
  } catch {
    // PerformanceObserver not supported
  }
}

/**
 * Long Task Monitor - мониторинг долгих задач (>50ms)
 */
export function startLongTaskMonitor() {
  if (import.meta.env.MODE === 'production') return
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(0)}ms`, entry)
        }
      }
    })
    
    observer.observe({ type: 'longtask', buffered: true })
    
    return () => observer.disconnect()
  } catch {
    // PerformanceObserver not supported
  }
}

/**
 * Инициализация всех мониторов производительности
 */
export function initPerformanceMonitoring() {
  if (import.meta.env.MODE === 'production') return

  console.log('🔍 Performance monitoring started')
  
  const stopFPS = startFPSMonitor()
  const stopLayoutShift = startLayoutShiftMonitor()
  const stopLongTask = startLongTaskMonitor()
  
  return () => {
    stopFPS?.()
    stopLayoutShift?.()
    stopLongTask?.()
    console.log('🔍 Performance monitoring stopped')
  }
}

export default initPerformanceMonitoring


