import { User, Product, Feedback, Order } from './models'

// Auth API types
export interface LoginRequest {
  email?: string
  phone?: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface RefreshResponse {
  access_token: string
}

export interface OtpSendRequest {
  phone: string
}

export interface OtpSendResponse {
  message: string
  expires_in: number
  dev_code?: string
}

export interface OtpVerifyRequest {
  phone: string
  code: string
  first_name?: string
}

export interface OtpVerifyResponse extends AuthResponse {
  auto_created?: boolean
  dev_password?: string
  code?: string
  error?: string
}

// Products API types
export interface ProductsResponse {
  products: Product[]
  total: number
  pages: number
  current_page: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

export interface ProductFilters {
  page?: number
  per_page?: number
  category?: string
  search?: string
  min_price?: number
  max_price?: number
  featured?: boolean
  sort?: string
  order?: 'asc' | 'desc'
}

// Orders API types
export interface CreateOrderRequest {
  items: Array<{ product_id: number; quantity: number }>
  payment_method?: string
  delivery_method?: string
  delivery_address?: string
  delivery_cost?: number
  discount?: number
  promo_code?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_note?: string
}

export interface UpdateOrderStatusRequest {
  status?: string
  payment_status?: string
  admin_note?: string
}

export interface CreateOrderResponse {
  order: Order
  auto_account_created?: boolean
  user?: User
  access_token?: string
  refresh_token?: string
  code?: string
  error?: string
}

// Feedback API types
export interface CreateFeedbackRequest {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  source_page?: string
}

export interface FeedbackResponse {
  message: string
  id: number
}

export interface FeedbackListResponse {
  feedback: Feedback[]
  total: number
  pages: number
  current_page: number
  unread_count: number
}

// Dashboard API types
export interface DashboardStats {
  total_users: number
  total_products: number
  total_orders: number
  orders_in_period: number
  revenue: number
  pending_orders: number
  unread_feedback: number
  new_users: number
  period_days: number
}

export interface SalesChartData {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  total_quantity: number
  total_revenue: number
}

// Generic API types
export interface ApiError {
  error: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  pages: number
  current_page: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

