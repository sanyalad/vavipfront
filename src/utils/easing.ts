/**
 * BORK-style премиальные easing функции
 * Основаны на принципах: медленные, плавные, естественные
 */

export const easing = {
  // Основная премиальная кривая BORK (для большинства transitions)
  premium: [0.4, 0, 0.2, 1] as const,
  
  // Для медленных плавных анимаций (hero, крупные элементы)
  smooth: [0.25, 0.1, 0.25, 1] as const,
  
  // Для выезжающих элементов (drawer, modal)
  enter: [0.23, 0.9, 0.15, 1] as const,
  
  // Для исчезающих элементов
  exit: [0.4, 0, 1, 1] as const,
  
  // Для spring-подобных анимаций (кнопки, карточки)
  spring: [0.34, 1.56, 0.64, 1] as const,
  
  // Для микро-интеракций (hover, tap)
  micro: [0.4, 0, 0.6, 1] as const,
} as const

// CSS строки для использования в CSS
export const easingCSS = {
  premium: 'cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  enter: 'cubic-bezier(0.23, 0.9, 0.15, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  micro: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const

// Type exports
export type EasingType = keyof typeof easing
export type EasingValue = (typeof easing)[EasingType]


