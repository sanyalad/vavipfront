import { useRef, useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import styles from './RotaryDialCircular.module.css'

interface RotaryDialCircularProps {
  phoneNumber: string
  onDigitClick?: (digit: string) => void
}

export function RotaryDialCircular({
  phoneNumber = '+7 (999) 123-45-67',
  onDigitClick,
}: RotaryDialCircularProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dialPlateRef = useRef<HTMLDivElement>(null)

  const [rotation, setRotation] = useState(0) // В градусах
  const [isDragging, setIsDragging] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [dragVelocity, setDragVelocity] = useState(0)

  // Refs для драга
  const dragStartRef = useRef({ angle: 0, rotation: 0, time: 0 })
  const dragLastRef = useRef({ angle: 0, time: 0 })
  const returnRafRef = useRef<number | null>(null)

  // Извлекаем только цифры (10 цифр = 0-9)
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

  // === ANGULAR POSITIONING ===

  /**
   * Угол кнопки на диале
   * 0° = вверху (12 часов)
   * 36° = следующая кнопка (по часовой)
   */
  const getButtonAngle = useCallback((index: number): number => {
    return (index * 36) % 360
  }, [])

  /**
   * Какая цифра находится в "окне" (вверху, в позиции 0°)
   */
  const getSelectedDigit = useCallback(
    (currentRotation: number): { digit: string; index: number } => {
      let closestIndex = 0
      let closestDiff = Infinity

      digits.forEach((digit, idx) => {
        const buttonAngle = getButtonAngle(idx)
        // Нормализуем угол с учетом вращения
        let diff = Math.abs(((buttonAngle - currentRotation) % 360 + 360) % 360)
        // Кратчайшее расстояние (не более 180°)
        if (diff > 180) diff = 360 - diff

        if (diff < closestDiff) {
          closestDiff = diff
          closestIndex = idx
        }
      })

      return { digit: digits[closestIndex], index: closestIndex }
    },
    [digits, getButtonAngle]
  )

  /**
   * Вычисляем угол от центра контейнера до точки
   */
  const getAngleFromCenter = useCallback(
    (x: number, y: number): number => {
      if (!containerRef.current) return 0

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const dx = x - (rect.left + centerX)
      const dy = y - (rect.top + centerY)

      // atan2 возвращает углы в диапазоне [-π, π]
      // Преобразуем в [0, 360) и нормализуем (0° = вверху)
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI)
      if (angle < 0) angle += 360

      return angle
    },
    []
  )

  /**
   * SPRING PHYSICS RETURN - как на настоящем ротарном телефоне
   * 
   * Система работает так:
   * 1. currentRotation → targetRotation (36° шаг)
   * 2. Вычисляем разницу (delta)
   * 3. Применяем spring force: force = -spring * delta - damping * velocity
   * 4. Обновляем velocity и position
   * 5. Затухаем пока не достигнем целевой позиции
   */
  const returnToHome = useCallback(() => {
    if (returnRafRef.current) {
      cancelAnimationFrame(returnRafRef.current)
    }

    setIsReturning(true)

    // Определяем целевой угол (snap на ближайшую цифру, кратно 36°)
    const selectedIndex = getSelectedDigit(rotation).index
    const targetRotation = selectedIndex * 36

    // Spring physics parameters
    const springStiffness = 0.25  // Жесткость пружины (выше = быстрее возвращается)
    const dampingRatio = 0.55     // Демпфирование (выше = меньше пружинит)

    // Начальные условия
    let currentRot = rotation
    let currentVel = 0  // Текущая скорость вращения

    const animate = () => {
      const dt = 16 / 1000  // Примерно 60fps = 16ms

      // Вычисляем вектор к цели (кратчайший путь)
      let delta = targetRotation - currentRot
      
      // Нормализуем в диапазон [-180, 180] для кратчайшего пути
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360

      // Spring force (притягивает к цели)
      const springForce = -springStiffness * delta

      // Damping force (сопротивление движению)
      const dampingForce = -dampingRatio * currentVel

      // Итоговая сила
      const totalForce = springForce + dampingForce

      // Обновляем скорость (F = ma, a = F/m, v = v + a*t)
      currentVel += totalForce * dt

      // Обновляем позицию
      currentRot += currentVel * dt

      // Нормализуем rotation в диапазон [0, 360)
      currentRot = ((currentRot % 360) + 360) % 360

      setRotation(currentRot)

      // Проверяем сходимость (когда движение практически прекратилось)
      const positionError = Math.abs(delta)
      const velocityError = Math.abs(currentVel)

      // Если отклонение и скорость достаточно малы - завершаем
      if (positionError < 0.1 && velocityError < 0.1) {
        setRotation(targetRotation)
        setIsReturning(false)
        const { digit } = getSelectedDigit(targetRotation)
        onDigitClick?.(digit)
        return
      }

      returnRafRef.current = requestAnimationFrame(animate)
    }

    returnRafRef.current = requestAnimationFrame(animate)
  }, [rotation, getSelectedDigit, onDigitClick])

  // === POINTER DOWN ===
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isReturning) return

      setIsDragging(true)
      const angle = getAngleFromCenter(e.clientX, e.clientY)

      dragStartRef.current = {
        angle,
        rotation,
        time: performance.now(),
      }

      dragLastRef.current = {
        angle,
        time: performance.now(),
      }

      if (returnRafRef.current) {
        cancelAnimationFrame(returnRafRef.current)
        returnRafRef.current = null
      }
    },
    [rotation, isReturning, getAngleFromCenter]
  )

  // === POINTER MOVE ===
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return

      const currentAngle = getAngleFromCenter(e.clientX, e.clientY)
      const deltaAngle = currentAngle - dragStartRef.current.angle

      // Новый поворот диала
      const newRotation = dragStartRef.current.rotation + deltaAngle

      // Ограничиваем чтобы не уходило слишком далеко
      const maxRotation = 360 * 2
      const clampedRotation =
        newRotation % 360 < 0
          ? ((newRotation % 360) + 360) % 360
          : (newRotation % 360)

      setRotation(clampedRotation)

      // Вычисляем velocity для более плавного возврата
      const now = performance.now()
      const timeDelta = now - dragLastRef.current.time
      const angleDelta = Math.abs(currentAngle - dragLastRef.current.angle)

      if (timeDelta > 0 && timeDelta < 100) {
        setDragVelocity(angleDelta / timeDelta)
      }

      dragLastRef.current = { angle: currentAngle, time: now }
    },
    [isDragging, getAngleFromCenter]
  )

  // === POINTER UP ===
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return

      setIsDragging(false)
      // Запускаем возврат с spring physics (dragVelocity больше не используется)
      returnToHome()
    },
    [isDragging, returnToHome]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (returnRafRef.current) {
        cancelAnimationFrame(returnRafRef.current)
      }
    }
  }, [])

  const selectedDigit = getSelectedDigit(rotation)

  return (
    <div className={styles.container}>
      {/* ЛЕВАЯ КОЛОНКА - ЦИФЕРБЛАТ */}
      <div className={styles.dialSection}>
        <div
          className={styles.dialWrapper}
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className={styles.dialFrame}>
            {/* Индикатор вверху */}
            <div className={styles.selectionIndicator} />

            {/* Вращающийся диал */}
            <div
              className={clsx(styles.dialPlate, {
                [styles.dragging]: isDragging,
                [styles.returning]: isReturning,
              })}
              ref={dialPlateRef}
              style={{
                '--rotation': `${rotation}deg`,
              } as React.CSSProperties}
            >
              {/* Кнопки-кружки */}
              {digits.map((digit, idx) => {
                const isSelected = selectedDigit.digit === digit
                const buttonAngle = getButtonAngle(idx)

                return (
                  <button
                    key={idx}
                    className={clsx(styles.dialButton, {
                      [styles.selected]: isSelected,
                    })}
                    style={{
                      '--button-angle': `${buttonAngle}deg`,
                    } as React.CSSProperties}
                    disabled={isDragging || isReturning}
                    aria-label={`Digit ${digit}`}
                  >
                    <span className={styles.digitText}>{digit}</span>
                  </button>
                )
              })}

              {/* Центральный штифт */}
              <div className={styles.centerPin} />
            </div>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА - КОНТЕНТ */}
      <div className={styles.contentSection}>
        <div className={styles.phoneNumber}>{phoneNumber}</div>
        <div className={styles.hint}>Крутите диал</div>
      </div>
    </div>
  )
}

