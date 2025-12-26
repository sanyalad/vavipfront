import { useRef, useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import styles from './RotaryDialRealistic.module.css'

interface RotaryDialRealisticProps {
  phoneNumber: string
  onDigitClick?: (digit: string) => void
}

export function RotaryDialRealistic({
  phoneNumber = '+7 (999) 123-45-67',
  onDigitClick,
}: RotaryDialRealisticProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dialRef = useRef<HTMLDivElement>(null)

  const [offsetY, setOffsetY] = useState(0) // Смещение по оси Y (вверх-вниз)
  const [isDragging, setIsDragging] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [dragVelocity, setDragVelocity] = useState(0)

  // Refs для драга
  const dragStartRef = useRef({ y: 0, offsetY: 0 })
  const dragLastRef = useRef({ y: 0, time: 0 })
  const returnRafRef = useRef<number | null>(null)

  // Извлекаем только цифры
  const digits = phoneNumber.replace(/\D/g, '').split('')

  // Позиция каждой кнопки на оси Y (в пикселях от центра)
  // 0 в центре, 1 на +70px, 2 на -70px, и т.д.
  const getButtonPosition = useCallback(
    (index: number): number => {
      const centerIndex = Math.floor(digits.length / 2)
      return (index - centerIndex) * 70 // 70px между кнопками
    },
    [digits.length]
  )

  // Вычисляем какая цифра в "окне" (в центре экрана)
  const getSelectedDigit = useCallback(
    (currentOffset: number): { digit: string; index: number } => {
      let closestIndex = 0
      let closestDiff = Infinity

      digits.forEach((digit, idx) => {
        const buttonPos = getButtonPosition(idx)
        const diff = Math.abs(buttonPos + currentOffset) // buttonPos + offset = позиция на экране
        if (diff < closestDiff) {
          closestDiff = diff
          closestIndex = idx
        }
      })

      return { digit: digits[closestIndex], index: closestIndex }
    },
    [digits, getButtonPosition]
  )

  // === RETURN TO HOME (ускоренное возращение) ===
  const returnToHome = useCallback(
    (velocity: number = 0) => {
      if (returnRafRef.current) {
        cancelAnimationFrame(returnRafRef.current)
      }

      setIsReturning(true)
      const startTime = performance.now()
      const startOffset = offsetY
      const targetOffset = 0

      // Если была скорость - учитываем её для более долгого возврата
      let duration = 400 + Math.abs(velocity) * 50

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(1, elapsed / duration)
        const eased = easeOutCubic(progress)

        const newOffset = startOffset + (targetOffset - startOffset) * eased
        setOffsetY(newOffset)

        if (progress < 1) {
          returnRafRef.current = requestAnimationFrame(animate)
        } else {
          setOffsetY(0)
          setIsReturning(false)
          // Вызываем callback с выбранной цифрой после возврата
          const selected = getSelectedDigit(0)
          onDigitClick?.(selected.digit)
        }
      }

      returnRafRef.current = requestAnimationFrame(animate)
    },
    [offsetY, getSelectedDigit, onDigitClick]
  )

  // === POINTER DOWN ===
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isReturning) return

      setIsDragging(true)

      dragStartRef.current = {
        y: e.clientY,
        offsetY,
      }

      dragLastRef.current = {
        y: e.clientY,
        time: performance.now(),
      }

      if (returnRafRef.current) {
        cancelAnimationFrame(returnRafRef.current)
        returnRafRef.current = null
      }
    },
    [offsetY, isReturning]
  )

  // === POINTER MOVE ===
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return

      const deltaY = e.clientY - dragStartRef.current.y
      const newOffset = dragStartRef.current.offsetY + deltaY

      // Ограничиваем смещение (чтобы не уходило слишком далеко)
      const maxOffset = 300
      const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, newOffset))

      setOffsetY(clampedOffset)

      // Вычисляем velocity
      const now = performance.now()
      const timeDelta = now - dragLastRef.current.time
      const distDelta = Math.abs(e.clientY - dragLastRef.current.y)

      if (timeDelta > 0 && timeDelta < 100) {
        setDragVelocity(distDelta / timeDelta)
      }

      dragLastRef.current = { y: e.clientY, time: now }
    },
    [isDragging]
  )

  // === POINTER UP ===
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return

      setIsDragging(false)

      // Начинаем возврат с учетом скорости
      returnToHome(dragVelocity)
    },
    [isDragging, dragVelocity, returnToHome]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (returnRafRef.current) {
        cancelAnimationFrame(returnRafRef.current)
      }
    }
  }, [])

  const selectedDigit = getSelectedDigit(offsetY)

  return (
    <div className={styles.container}>
      {/* Номер телефона */}
      <div className={styles.phoneNumber}>{phoneNumber}</div>

      {/* Основной диал с 3D эффектом */}
      <div
        className={styles.dialWrapper}
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Визуальный фрейм диала (статичный) */}
        <div className={styles.dialFrame}>
          {/* Центральное окно где видна выбранная цифра */}
          <div className={styles.selectionWindow}>
            <div className={styles.selectedDigitDisplay}>{selectedDigit.digit}</div>
          </div>

          {/* Кнопки, которые крутятся */}
          <div
            className={clsx(styles.dialButtonsAxis, {
              [styles.dragging]: isDragging,
              [styles.returning]: isReturning,
            })}
            ref={dialRef}
            style={{
              '--offset-y': `${offsetY}px`,
            } as React.CSSProperties}
          >
            {digits.map((digit, idx) => {
              const isSelected = selectedDigit.digit === digit
              const buttonPositionY = getButtonPosition(idx)

              return (
                <button
                  key={idx}
                  className={clsx(styles.dialButton, {
                    [styles.selected]: isSelected,
                  })}
                  style={{
                    '--button-index': idx,
                    '--button-position': `${buttonPositionY}px`,
                  } as React.CSSProperties}
                  disabled={isDragging || isReturning}
                >
                  <span className={styles.digitText}>{digit}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Инструкция */}
      <div className={styles.dialHint}>Потяните кнопки</div>
    </div>
  )
}

