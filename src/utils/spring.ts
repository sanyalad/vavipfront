/**
 * Физические spring-конфигурации с эффектом гравитации
 * Основаны на реальной физике: масса, жесткость, затухание
 */

export const spring = {
  // Легкая гравитация - для мелких элементов (кнопки, иконки)
  light: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
    mass: 0.5,
  },
  
  // Средняя гравитация - для карточек, модальных окон
  medium: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
    mass: 1,
  },
  
  // Тяжелая гравитация - для крупных элементов (drawer, панели)
  heavy: {
    type: 'spring' as const,
    stiffness: 150,
    damping: 18,
    mass: 1.5,
  },
  
  // Очень тяжелая гравитация - для видео-секций, hero
  veryHeavy: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 15,
    mass: 2,
  },
  
  // Без затухания - для bounce эффектов (опционально)
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10,
    mass: 1,
  },
  
  // Плавное затухание - для fade эффектов
  smooth: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 25,
    mass: 1,
  },
} as const

/**
 * Параметры для разных типов анимаций
 */
export const springPresets = {
  // Для элементов, которые "падают" вниз (гравитация)
  gravityDown: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 22,
    mass: 1.2,
  },
  
  // Для элементов, которые "поднимаются" вверх (против гравитации)
  gravityUp: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
    mass: 0.8, // Легче для подъема
  },
  
  // Для горизонтальных движений (меньше гравитации)
  horizontal: {
    type: 'spring' as const,
    stiffness: 250,
    damping: 23,
    mass: 1,
  },
} as const

// Type exports
export type SpringType = keyof typeof spring
export type SpringPresetType = keyof typeof springPresets
export type SpringConfig = (typeof spring)[SpringType]


