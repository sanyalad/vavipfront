import { useState, useEffect, useCallback, useRef } from 'react'

interface ScrollState {
  scrollY: number
  scrollX: number
  direction: 'up' | 'down' | null
  isAtTop: boolean
  isAtBottom: boolean
}

export function useScroll(threshold = 50): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrollY: 0,
    scrollX: 0,
    direction: null,
    isAtTop: true,
    isAtBottom: false,
  })

  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight

      setState({
        scrollY: currentScrollY,
        scrollX: window.scrollX,
        direction: currentScrollY > lastScrollY.current ? 'down' : 'up',
        isAtTop: currentScrollY <= threshold,
        isAtBottom: currentScrollY >= maxScroll - threshold,
      })

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial call

    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return state
}

// Hook for scroll progress (0-1)
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const currentProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0
      setProgress(Math.min(1, Math.max(0, currentProgress)))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return progress
}

// Hook for section visibility (Intersection Observer)
export function useSectionInView(
  threshold = 0.5
): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return [ref, isInView]
}

// Hook for scroll locking
export function useScrollLock() {
  const lock = useCallback(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
  }, [])

  const unlock = useCallback(() => {
    const scrollY = document.body.style.top
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, parseInt(scrollY || '0') * -1)
  }, [])

  return { lock, unlock }
}

// Hook for smooth scroll to element
export function useSmoothScroll() {
  const scrollTo = useCallback((elementId: string, offset = 0) => {
    const element = document.getElementById(elementId)
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { scrollTo, scrollToTop }
}












