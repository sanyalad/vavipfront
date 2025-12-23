import { ReactNode } from 'react'

// Component props types
export interface ChildrenProps {
  children: ReactNode
}

export interface ClassNameProps {
  className?: string
}

// Animation variants
export interface AnimationVariants {
  initial: object
  animate: object
  exit?: object
}

// Form field types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'number'
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

// Toast/Notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// Theme types
export interface Theme {
  colors: {
    bg: string
    bgSecondary: string
    accent: string
    textPrimary: string
    textSecondary: string
  }
}

// Video section types
export interface VideoSection {
  id: number
  title: string
  subtitle: string
  videoSrc: string
  posterSrc?: string
  link: string
}

// Navigation types
export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

// Dropdown menu types
export interface DropdownItem {
  label: string
  href: string
  image?: string
  description?: string
}

export interface DropdownMenu {
  trigger: string
  items: DropdownItem[]
}











