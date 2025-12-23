// User types
export interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: 'customer' | 'admin' | 'manager'
  is_active: boolean
  created_at: string | null
}

export interface Address {
  id: number
  title: string | null
  country: string
  city: string
  street: string
  building: string | null
  apartment: string | null
  postal_code: string | null
  is_default: boolean
}

// Product types
export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  parent_id: number | null
  is_active: boolean
  sort_order: number
  children?: Category[]
}

export interface ProductImage {
  id: number
  url: string
  alt_text: string | null
  is_main: boolean
  sort_order: number
}

export interface ProductAttribute {
  id: number
  name: string
  value: string
}

export interface Product {
  id: number
  name: string
  slug: string
  sku: string | null
  price: number
  old_price: number | null
  currency: string
  category_id: number | null
  stock_quantity: number
  is_active: boolean
  is_featured: boolean
  short_description: string | null
  main_image: string | null
  description?: string
  images?: ProductImage[]
  attributes?: ProductAttribute[]
  category?: Category
}

// Order types
export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_sku: string | null
  product_image: string | null
  quantity: number
  price: number
  total: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Order {
  id: number
  order_number: string
  user_id: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: string | null
  delivery_method: string | null
  delivery_address: string | null
  delivery_cost: number
  subtotal: number
  discount: number
  total: number
  currency: string
  promo_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_note: string | null
  created_at: string | null
  updated_at: string | null
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  items?: OrderItem[]
}

// Contact types
export interface Contact {
  id: number
  country: string
  country_code: string | null
  city: string
  address: string
  phone: string | null
  email: string | null
  working_hours: string | null
  map_lat: number | null
  map_lng: number | null
  photo_url: string | null
  map_image_url: string | null
  is_headquarters: boolean
  is_active: boolean
  sort_order: number
}

export interface CountryContacts {
  country: string
  country_code: string | null
  map_image_url: string | null
  offices: Contact[]
}

// Feedback types
export interface Feedback {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  source_page: string | null
  status: 'new' | 'read' | 'replied' | 'closed'
  is_read: boolean
  created_at: string | null
}

// Cart types
export interface CartItem {
  product: Product
  quantity: number
}











