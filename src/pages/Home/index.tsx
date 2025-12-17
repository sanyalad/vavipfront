import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import VideoSection from '@/components/animations/VideoSection'
import Footer from '@/components/layout/Footer'
import { useTrackpadGesture } from '@/hooks/useTrackpadGesture'
import styles from './Home.module.css'

const videoSections = [
  {
    id: 'uzel-vvoda',
    title: 'УЗЕЛ ВВОДА',
    videoSrc: '/videos/background1.webm',
    posterSrc: undefined,
    link: '/catalog/uzel-vvoda',
  },
  {
    id: 'bim',
    title: 'ПРОЕКТИРОВАНИЕ BIM',
    videoSrc: '/videos/background2.webm',
    posterSrc: undefined,
    link: '/services/bim',
  },
  {
    id: 'montazh',
    title: 'МОНТАЖ',
    videoSrc: '/videos/background3.webm',
    posterSrc: undefined,
    link: '/services/montazh',
  },
  {
    id: 'shop',
    title: 'МАГАЗИН',
    videoSrc: '/videos/background4.webm',
    posterSrc: undefined,
    link: '/shop',
  },
]

const WHEEL_THRESHOLD = 1
const SCROLL_DEBOUNCE = 520
const SNAP_THRESHOLD = 0.5
const WHEEL_GESTURE_IDLE_RESET_MS = 520
const TRACKPAD_GESTURE_IDLE_FINALIZE_MS = 110

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)

  const videoWrapperRef = useRef<HTMLDivElement | null>(null)
  const footerDrawerRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)
  const animationTimerRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  const gestureTimerRef = useRef<number | null>(null)
  const lastSlideArrivedAtRef = useRef(0)
  const lastWheelTsRef = useRef(0)
  const wheelGestureStateRef = useRef<{ direction: 'next' | 'prev' | null; progress: number }>({
    direction: null,
    progress: 0,
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [isGesturing, setIsGesturing] = useState(false)
  const [footerProgress, setFooterProgress] = useState(0)
  const [isFooterOpen, setIsFooterOpen] = useState(false)
  const lastSlideIndex = useMemo(() => videoSections.length - 1, [])

  const clampIndex = useCallback(
    (value: number) => Math.min(Math.max(value, 0), lastSlideIndex),
    [lastSlideIndex],
  )

  const stopAnimationTimer = useCallback(() => {
    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    isAnimatingRef.current = false
  }, [])

  const setFooterProgressSafe = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next))
    setFooterProgress(v)
  }, [])

  const openFooter = useCallback(() => {
    setIsFooterOpen(true)
    setFooterProgressSafe(1)
    requestAnimationFrame(() => {
      footerDrawerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [setFooterProgressSafe])

  const closeFooter = useCallback(() => {
    setIsFooterOpen(false)
    setFooterProgressSafe(0)
  }, [setFooterProgressSafe])

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      if (isFooterOpen || footerProgress > 0.02) {
        closeFooter()
      }
      const safeIndex = clampIndex(nextIndex)
      if (safeIndex === activeIndex || isAnimatingRef.current) return

      const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

      stopAnimationTimer()
      isAnimatingRef.current = true
      setIsGesturing(false)
      setFromIndex(activeIndex)
      setIncomingIndex(safeIndex)
      setDirection(nextDirection)
      setIsAnimating(true)

      const timeout = prefersReducedMotion.current ? 150 : SCROLL_DEBOUNCE
      animationTimerRef.current = window.setTimeout(() => {
        setActiveIndex(safeIndex)
        setIncomingIndex(null)
        setIsAnimating(false)
        isAnimatingRef.current = false
        lastSlideArrivedAtRef.current = safeIndex === lastSlideIndex ? performance.now() : 0
        setDirection(null)
        setIsGesturing(false)
        animationTimerRef.current = null
      }, timeout)
    },
    [activeIndex, clampIndex, closeFooter, isFooterOpen, footerProgress, lastSlideIndex, stopAnimationTimer],
  )

  const onTrackpadGesture = useCallback(
    (gestureDir: 'next' | 'prev', progress: number, isCommit: boolean) => {
      if (isAnimatingRef.current) return
      if (gestureDir === 'prev' && activeIndex === 0) return
      if (gestureDir === 'next' && activeIndex === lastSlideIndex) {
        // Handle footer opening
        if (isCommit) {
          const canOpenFooter =
            lastSlideArrivedAtRef.current > 0 &&
            performance.now() - lastSlideArrivedAtRef.current > 220
          if (canOpenFooter) openFooter()
        }
        return
      }

      if (isCommit) {
        // Commit gesture - navigate to next slide
        wheelGestureStateRef.current = { direction: null, progress: 0 }
        const nextIndex = clampIndex(activeIndex + (gestureDir === 'next' ? 1 : -1))
        scrollToIndex(nextIndex)
      } else {
        // Update gesture progress
        wheelGestureStateRef.current = { direction: gestureDir, progress }
        if (!isGesturing) {
          setIsGesturing(true)
          setFromIndex(activeIndex)
          setIncomingIndex(clampIndex(activeIndex + (gestureDir === 'next' ? 1 : -1)))
          setDirection(gestureDir)
          setIsAnimating(false)
        }
        setGestureProgress(progress)
      }
    },
    [activeIndex, clampIndex, lastSlideIndex, isGesturing, openFooter, scrollToIndex],
  )

  const wheelRange = Math.min(800, Math.max(280, window.innerHeight * 0.85))
  const { handleWheelEvent: handleTrackpad } = useTrackpadGesture(onTrackpadGesture, wheelRange)

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (prefersReducedMotion.current) return
      if (document.body.classList.contains('dropdown-scroll-lock')) return

      const wrapper = videoWrapperRef.current
      if (!wrapper) return

      const wrapperRect = wrapper.getBoundingClientRect()
      const wrapperTopAligned = Math.abs(wrapperRect.top) <= 2
      const wrapperFillsViewport = wrapperRect.bottom >= window.innerHeight * 0.92
      if (!wrapperTopAligned || !wrapperFillsViewport) return

      let deltaY = event.deltaY || 0
      if (event.deltaMode === 1) deltaY *= 16
      if (event.deltaMode === 2) deltaY *= window.innerHeight
      if (Math.abs(deltaY) < WHEEL_THRESHOLD) return

      const now = performance.now()
      const wheelDt = now - lastWheelTsRef.current
      lastWheelTsRef.current = now

      const isTrackpad =
        event.deltaMode === 0 && (Math.abs(deltaY) < 85 || wheelDt < 180)

      // Handle trackpad with new hook
      if (isTrackpad) {
        const handled = handleTrackpad(event)
        if (handled) return
      }

      // Mouse wheel behavior
      if (footerProgressSafe > 0.02 && activeIndex !== lastSlideIndex) {
        event.preventDefault()
        closeFooter()
        return
      }

      if (activeIndex === lastSlideIndex) {
        const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'
        const canOpenFooter =
          lastSlideArrivedAtRef.current > 0 &&
          performance.now() - lastSlideArrivedAtRef.current > 220

        if (isFooterOpen) {
          const footerEl = footerDrawerRef.current
          const targetNode = event.target as Node | null
          const isInsideFooter = !!(footerEl && targetNode && footerEl.contains(targetNode))
          const canScrollUpInside =
            !!footerEl && footerEl.scrollHeight > footerEl.clientHeight && footerEl.scrollTop > 0

          if (dir === 'prev' && (!isInsideFooter || !canScrollUpInside)) {
            event.preventDefault()
            closeFooter()
            return
          }

          if (isInsideFooter) return

          event.preventDefault()
          return
        }

        if (dir === 'next') {
          event.preventDefault()
          if (!canOpenFooter) return
          openFooter()
          return
        }
      }

      if (isAnimatingRef.current) {
        event.preventDefault()
        return
      }

      event.preventDefault()
      const dir: 'next' | 'prev' = deltaY > 0 ? 'next' : 'prev'

      if (dir === 'prev' && activeIndex === 0) return

      const nextIndex = clampIndex(activeIndex + (dir === 'next' ? 1 : -1))
      scrollToIndex(nextIndex)
    },
    [
      activeIndex,
      clampIndex,
      closeFooter,
      handleTrackpad,
      isFooterOpen,
      lastSlideIndex,
      openFooter,
      scrollToIndex,
    ],
  )

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    if (document.body.classList.contains('dropdown-scroll-lock')) return
    if (isAnimatingRef.current) return
    touchStartY.current = event.touches[0]?.clientY ?? 0
  }, [])

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (prefersReducedMotion.current) return
      if (document.body.classList.contains('dropdown-scroll-lock')) return
      if (isAnimatingRef.current) return

      const y = event.touches[0]?.clientY ?? 0
      const diff = touchStartY.current - y
      if (Math.abs(diff) < 6) return

      const dir: 'next' | 'prev' = diff > 0 ? 'next' : 'prev'

      if (activeIndex === lastSlideIndex) {
        const range = Math.min(780, Math.max(300, window.innerHeight * 0.72))

        if (dir === 'next') {
          event.preventDefault()
          setIsGesturing(true)
          setGestureProgress(Math.min(1, Math.abs(diff) / range))
          return
        }

        if (dir === 'prev' && isFooterOpen) {
          event.preventDefault()
          setIsGesturing(true)
          const closeAmount = Math.min(1, Math.abs(diff) / range)
          setGestureProgress(1 - closeAmount)
          setFooterProgressSafe(1 - closeAmount)
          return
        }
      }

      if (dir === 'prev' && activeIndex === 0) return

      event.preventDefault()

      if (!isGesturing) {
        setIsGesturing(true)
        setFromIndex(activeIndex)
        setIncomingIndex(clampIndex(activeIndex + (dir === 'next' ? 1 : -1)))
        setDirection(dir)
        setIsAnimating(false)
      }

      const range = Math.min(780, Math.max(300, window.innerHeight * 0.72))
      const nextProgress = Math.min(1, Math.abs(diff) / range)
      setGestureProgress(nextProgress)
    },
    [activeIndex, clampIndex, isFooterOpen, lastSlideIndex, isGesturing, setFooterProgressSafe],
  )

  const handleTouchEnd = useCallback(() => {
    if (prefersReducedMotion.current) return
    if (isAnimatingRef.current) return

    if (activeIndex === lastSlideIndex) {
      if (!isFooterOpen) {
        if (gestureProgress >= SNAP_THRESHOLD) openFooter()
        else closeFooter()
      } else {
        if (gestureProgress <= 1 - SNAP_THRESHOLD) closeFooter()
        else openFooter()
      }
      setIsGesturing(false)
      return
    }

    if (gestureProgress >= SNAP_THRESHOLD && direction) {
      const nextIndex = clampIndex(activeIndex + (direction === 'next' ? 1 : -1))
      scrollToIndex(nextIndex)
    }

    setIsGesturing(false)
  }, [activeIndex, closeFooter, direction, gestureProgress, isFooterOpen, lastSlideIndex, openFooter, scrollToIndex, clampIndex])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (document.body.classList.contains('dropdown-scroll-lock')) return
      if (isAnimatingRef.current) return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        if (activeIndex === lastSlideIndex) {
          event.preventDefault()
          openFooter()
          return
        }
        event.preventDefault()
        scrollToIndex(activeIndex + 1)
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        if (activeIndex === lastSlideIndex && isFooterOpen) {
          event.preventDefault()
          closeFooter()
          return
        }
        if (activeIndex === 0) {
          event.preventDefault()
          return
        }
        event.preventDefault()
        scrollToIndex(activeIndex - 1)
      }
    },
    [activeIndex, closeFooter, isFooterOpen, lastSlideIndex, openFooter, scrollToIndex],
  )

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, handleWheel])

  useEffect(() => {
    const wrapper = videoWrapperRef.current
    if (!wrapper) return
    wrapper.addEventListener('touchstart', handleTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false })
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: true })
    wrapper.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart)
      wrapper.removeEventListener('touchmove', handleTouchMove)
      wrapper.removeEventListener('touchend', handleTouchEnd)
      wrapper.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchEnd, handleTouchMove, handleTouchStart])

  useEffect(() => {
    return () => {
      stopAnimationTimer()
    }
  }, [stopAnimationTimer])

  useEffect(() => {
    const links: HTMLLinkElement[] = []

    videoSections.forEach((section, idx) => {
      const isHighPriority = idx < 2

      const webmLink = document.createElement('link')
      webmLink.rel = 'preload'
      webmLink.as = 'video'
      webmLink.href = section.videoSrc
      webmLink.type = 'video/webm'
      webmLink.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(webmLink)
      links.push(webmLink)

      const mp4Link = document.createElement('link')
      mp4Link.rel = 'preload'
      mp4Link.as = 'video'
      mp4Link.href = section.videoSrc.replace('.webm', '.mp4')
      mp4Link.type = 'video/mp4'
      mp4Link.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(mp4Link)
      links.push(mp4Link)
    })

    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [])

  useEffect(() => {
    const videoWrapper = videoWrapperRef.current
    if (!videoWrapper) return

    const checkFirstVideoReady = () => {
      const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
      if (firstVideo && firstVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        return true
      }
      return false
    }

    if (checkFirstVideoReady()) return

    const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
    if (!firstVideo) return

    firstVideo.addEventListener('loadedmetadata', () => {}, { once: true })
    firstVideo.addEventListener('canplay', () => {}, { once: true })

    return () => {
      firstVideo.removeEventListener('loadedmetadata', () => {})
      firstVideo.removeEventListener('canplay', () => {})
    }
  }, [])

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setHeaderHeight = () => {
      const header = document.querySelector('header')
      const h = header?.offsetHeight || 0
      document.documentElement.style.setProperty('--header-h', h + 'px')
    }

    setHeaderHeight()
    window.addEventListener('resize', setHeaderHeight)

    return () => {
      window.removeEventListener('resize', setHeaderHeight)
    }
  }, [])

  useEffect(() => {
    if (!location.hash) return
    const hash = location.hash.replace('#', '')
    const targetIndex = videoSections.findIndex((section) => section.id === hash)
    if (targetIndex >= 0) {
      scrollToIndex(targetIndex)
    }
  }, [location.hash, scrollToIndex])

  useEffect(() => {
    const isActive = footerProgress > 0.02
    if (isActive) document.body.classList.add('footer-drawer-active')
    else document.body.classList.remove('footer-drawer-active')
    return () => {
      document.body.classList.remove('footer-drawer-active')
    }
  }, [footerProgress])

  useEffect(() => {
    if (activeIndex === lastSlideIndex) return
    lastSlideArrivedAtRef.current = 0
    if (isFooterOpen || footerProgress > 0.02) {
      closeFooter()
    }
  }, [activeIndex, closeFooter, isFooterOpen, footerProgress, lastSlideIndex])

  const visibleNextIndex = useMemo(() => {
    return direction === 'next' ? incomingIndex : direction === 'prev' ? fromIndex : null
  }, [direction, incomingIndex, fromIndex])

  const visiblePrevIndex = useMemo(() => {
    return direction === 'next' ? fromIndex : direction === 'prev' ? incomingIndex : null
  }, [direction, fromIndex, incomingIndex])

  const footerProgressSafe = footerProgress

  return (
    <motion.div className={styles.home} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div
        ref={videoWrapperRef}
        className={styles.videoSectionsWrapper}
        data-direction={direction || 'idle'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--gesture-progress' as string]: String(gestureProgress) }}
      >
        {videoSections.map((section, index) => {
          const isNext = visibleNextIndex === index
          const isPrev = visiblePrevIndex === index
          const isActive = index === activeIndex && !isNext && !isPrev
          const nextVideoSrc =
            index < videoSections.length - 1 ? videoSections[index + 1].videoSrc : undefined

          return (
            <VideoSection
              key={section.id}
              {...section}
              index={index}
              isLast={index === videoSections.length - 1}
              isActive={isActive}
              isNext={isNext}
              isPrev={isPrev}
              direction={direction}
              nextVideoSrc={nextVideoSrc}
            />
          )
        })}
      </div>

      <div
        className={styles.footerBackdrop}
        data-visible={footerProgress > 0.02 ? 'true' : 'false'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--footer-progress' as string]: String(footerProgress) }}
        onClick={closeFooter}
        aria-hidden="true"
      />
      <div
        ref={footerDrawerRef}
        className={styles.footerDrawer}
        data-visible={footerProgress > 0.02 ? 'true' : 'false'}
        data-gesture={isGesturing ? 'true' : 'false'}
        style={{ ['--footer-progress' as string]: String(footerProgress) }}
        onClick={(e) => e.stopPropagation()}
      >
        <Footer />
      </div>

      <nav className={styles.mobileStrip} aria-label="Навигация по разделам">
        {videoSections.map((section, index) => (
          <button
            key={section.id}
            className={styles.mobileNavItem}
            data-section={section.id}
            onClick={() => scrollToIndex(index)}
          >
            {section.title}
          </button>
        ))}
      </nav>
    </motion.div>
  )
}
