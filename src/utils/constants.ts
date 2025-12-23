// API URLs
export const API_URL = import.meta.env.VITE_API_URL || '/api'
export const WS_URL = import.meta.env.VITE_WS_URL || ''

// App constants
export const APP_NAME = 'Vavip'
export const APP_DESCRIPTION = 'Премиальные инженерные системы, проектирование BIM, монтаж и продажа оборудования'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Animation durations (ms)
export const ANIMATION_FAST = 150
export const ANIMATION_BASE = 300
export const ANIMATION_SLOW = 500

// Breakpoints (px)
export const BREAKPOINTS = {
  mobile: 720,
  tablet: 1024,
  desktop: 1400,
} as const

// Order statuses
export const ORDER_STATUSES = {
  pending: 'Ожидает',
  confirmed: 'Подтвержден',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
} as const

// Payment statuses
export const PAYMENT_STATUSES = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  failed: 'Ошибка оплаты',
  refunded: 'Возвращен',
} as const

// Delivery methods
export const DELIVERY_METHODS = {
  courier: 'Курьерская доставка',
  pickup: 'Самовывоз',
  post: 'Почта России',
} as const

// Payment methods
export const PAYMENT_METHODS = {
  card: 'Картой онлайн',
  cash: 'Наличными при получении',
} as const











