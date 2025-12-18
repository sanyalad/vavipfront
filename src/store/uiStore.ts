import { create } from 'zustand'
import { Toast } from '@/types'

interface UIState {
  // Intro loader
  isIntroComplete: boolean
  setIntroComplete: (complete: boolean) => void
  
  // Mobile menu
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
  
  // Scroll lock
  isScrollLocked: boolean
  lockScroll: () => void
  unlockScroll: () => void
  
  // Active dropdown
  activeDropdown: string | null
  setActiveDropdown: (id: string | null) => void
  
  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Auth drawer (login/register as a sidebar)
  isAuthDrawerOpen: boolean
  authDrawerMode: 'login' | 'register'
  openAuthDrawer: (mode?: 'login' | 'register') => void
  closeAuthDrawer: () => void

  // Search overlay (BORK-like)
  isSearchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  
  // Theme (for future)
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Intro loader
  isIntroComplete: false,
  setIntroComplete: (complete) => set({ isIntroComplete: complete }),
  
  // Mobile menu
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  
  // Scroll lock
  isScrollLocked: false,
  lockScroll: () => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden'
    }
    set({ isScrollLocked: true })
  },
  unlockScroll: () => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = ''
    }
    set({ isScrollLocked: false })
  },
  
  // Active dropdown
  activeDropdown: null,
  setActiveDropdown: (id) => set({ activeDropdown: id }),
  
  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    
    // Auto remove after duration
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration || 5000)
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }))
  },

  // Auth drawer
  isAuthDrawerOpen: false,
  authDrawerMode: 'login',
  openAuthDrawer: (mode = 'login') => set({ isAuthDrawerOpen: true, authDrawerMode: mode }),
  closeAuthDrawer: () => set({ isAuthDrawerOpen: false }),

  // Search overlay
  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  
  // Theme
  theme: 'dark',
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark',
  })),
}))






