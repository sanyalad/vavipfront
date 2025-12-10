import { Suspense, lazy, useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import VideoSection from '@/components/animations/VideoSection'
import styles from './Home.module.css'

// Lazy load below-the-fold components
const ShopShowcase = lazy(() => import('@/components/shop/ShopShowcase'))
const UzelPreview = lazy(() => import('@/components/landing/UzelPreview'))
const Footer = lazy(() => import('@/components/layout/Footer'))

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

const WHEEL_THRESHOLD = 8
// Keep JS timing aligned with CSS animation (~550ms) with a small buffer
const SCROLL_DEBOUNCE = 570
const TOUCH_THRESHOLD = 42
const RETURN_THRESHOLD = 420

export default function HomePage() {
  const location = useLocation()
  const prefersReducedMotion = useRef(false)

  const videoWrapperRef = useRef<HTMLDivElement | null>(null)
  const shopSectionRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)
  const isReturningFromFooterRef = useRef(false)
  const lastActiveIndexBeforeCatalog = useRef<number | null>(null)
  const animationTimerRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fromIndex, setFromIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isReleased, setIsReleased] = useState(false)
  const [isFirstVideoReady, setIsFirstVideoReady] = useState(false)
  const lastSlideIndex = useMemo(() => videoSections.length - 1, [])

  // На мобильных сразу включаем нативный скролл (кастомный скролл дергается)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobileViewport = window.matchMedia('(max-width: 900px)').matches
    if (isMobileViewport) {
      setIsReleased(true)
      handleScrollLock(false)
    }
  }, [handleScrollLock])

  const clampIndex = useCallback(
    (value: number) => Math.min(Math.max(value, 0), lastSlideIndex),
    [lastSlideIndex],
  )

  const scrollToShopSection = useCallback(() => {
    const shopEl = shopSectionRef.current
    const top = shopEl ? shopEl.getBoundingClientRect().top + window.scrollY : 0
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: 'smooth' })
    })
  }, [])

  const scrollToSliderTop = useCallback(() => {
    const wrapperTop = videoWrapperRef.current?.offsetTop ?? 0
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: wrapperTop, behavior: 'auto' })
    })
  }, [])

  const ensureSliderAligned = useCallback((attempt = 0) => {
    const wrapperTop = videoWrapperRef.current?.offsetTop ?? 0
    const diff = Math.abs(window.scrollY - wrapperTop)
    if (diff <= 1 || attempt > 4) return
    window.scrollTo({ top: wrapperTop, behavior: 'auto' })
    window.requestAnimationFrame(() => ensureSliderAligned(attempt + 1))
  }, [])

  const handleScrollLock = useCallback((lock: boolean) => {
    if (prefersReducedMotion.current) return
    // Don't lock scroll until first video is ready
    if (lock && !isFirstVideoReady) return
    if (lock) {
      document.body.classList.add('spa-scroll-lock')
    } else {
      document.body.classList.remove('spa-scroll-lock')
    }
  }, [isFirstVideoReady])

  const stopAnimationTimer = useCallback(() => {
    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
  }, [])

  const scrollToIndex = useCallback((nextIndex: number) => {
    const safeIndex = clampIndex(nextIndex)
    if (safeIndex === activeIndex || isAnimating) return

    const nextDirection = safeIndex > activeIndex ? 'next' : 'prev'

    stopAnimationTimer()
    setFromIndex(activeIndex)
    setIncomingIndex(safeIndex)
    setDirection(nextDirection)
    setIsAnimating(true)

    const timeout = prefersReducedMotion.current ? 150 : SCROLL_DEBOUNCE
    animationTimerRef.current = window.setTimeout(() => {
      setActiveIndex(safeIndex)
      setIncomingIndex(null)
      setIsAnimating(false)
      setDirection(null)
      animationTimerRef.current = null
    }, timeout)
  }, [activeIndex, clampIndex, isAnimating, stopAnimationTimer])

  const releaseToCatalog = useCallback(() => {
    if (isReleased) return
    stopAnimationTimer()
    lastActiveIndexBeforeCatalog.current = activeIndex
    setDirection(null)
    setIncomingIndex(null)
    setIsAnimating(false)
    setIsReleased(true)
    handleScrollLock(false)
    scrollToShopSection()
  }, [activeIndex, handleScrollLock, isReleased, scrollToShopSection, stopAnimationTimer])

  const returnToSlider = useCallback((targetIndex?: number) => {
    stopAnimationTimer()
    // Восстанавливаем индекс, на котором были до перехода в каталог, или используем переданный
    const indexToRestore = targetIndex !== undefined 
      ? clampIndex(targetIndex) 
      : (lastActiveIndexBeforeCatalog.current !== null 
          ? clampIndex(lastActiveIndexBeforeCatalog.current) 
          : lastSlideIndex)
    
    // Сначала обновляем состояние синхронно
    setIsReleased(false)
    setActiveIndex(indexToRestore)
    setIncomingIndex(null)
    setDirection(null)
    setIsAnimating(false)
    
    // Скроллим наверх
    scrollToSliderTop()
    ensureSliderAligned()
    
    // Включаем блокировку скролла после небольшой задержки, чтобы скролл завершился
    // Используем двойной requestAnimationFrame для гарантии завершения скролла
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (isFirstVideoReady) {
          handleScrollLock(true)
        }
      })
    })
  }, [clampIndex, ensureSliderAligned, handleScrollLock, isFirstVideoReady, lastSlideIndex, scrollToSliderTop, stopAnimationTimer])

  const handleWheel = useCallback((event: WheelEvent) => {
    if (prefersReducedMotion.current) return

    const deltaY = event.deltaY || 0
    if (Math.abs(deltaY) < WHEEL_THRESHOLD) return

    // В каталоге: возвращаемся в стек только если каталог полностью выше экрана
    if (isReleased) {
      const shopEl = shopSectionRef.current
      if (!shopEl) return
      
      const shopRect = shopEl.getBoundingClientRect()
      const shopTopViewport = shopRect.top
      const returnThreshold = window.innerHeight + RETURN_THRESHOLD
      
      // Активируем кастомный скролл когда каталог уже ниже видимой области
      if (deltaY < 0 && shopTopViewport >= returnThreshold) {
        event.preventDefault()
        returnToSlider()
        return
      }
      // В каталоге не обрабатываем скролл для видеосекций
      return
    }

    // После возврата из каталога убеждаемся, что мы не в состоянии анимации
    if (isAnimating) {
      event.preventDefault()
      return
    }

    // Если на первом слайде и скролл вверх — ничего не делаем
    if (deltaY < 0 && activeIndex === 0) {
      event.preventDefault()
      return
    }

    // Если на последнем слайде — отпускаем к каталогу
    if (deltaY > 0 && activeIndex === lastSlideIndex) {
      event.preventDefault()
      releaseToCatalog()
      return
    }

    event.preventDefault()
    const nextIndex = clampIndex(activeIndex + (deltaY > 0 ? 1 : -1))
    scrollToIndex(nextIndex)
  }, [activeIndex, clampIndex, isAnimating, isReleased, lastSlideIndex, releaseToCatalog, returnToSlider, scrollToIndex])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (isReleased) return
    touchStartY.current = event.touches[0]?.clientY ?? 0
  }, [])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (prefersReducedMotion.current) return
    const endY = event.changedTouches[0]?.clientY ?? 0
    const diff = touchStartY.current - endY
    if (Math.abs(diff) < TOUCH_THRESHOLD) return
    const directionStep = diff > 0 ? 1 : -1

    // В каталоге: если каталог полностью выше экрана и свайп вверх — возвращаем в стек
    if (isReleased) {
      const shopEl = shopSectionRef.current
      if (!shopEl) return
      
      const shopRect = shopEl.getBoundingClientRect()
      const shopTopViewport = shopRect.top
      const returnThreshold = window.innerHeight + RETURN_THRESHOLD
      
      // Активируем кастомный скролл когда каталог уже ниже видимой области
      if (directionStep < 0 && shopTopViewport >= returnThreshold) {
        returnToSlider()
      }
      return
    }

    // Если на первом слайде и свайп вверх — ничего не делаем
    if (directionStep < 0 && activeIndex === 0) {
      return
    }

    if (directionStep > 0 && activeIndex === lastSlideIndex) {
      releaseToCatalog()
      return
    }

    const nextIndex = clampIndex(activeIndex + directionStep)
    scrollToIndex(nextIndex)
  }, [activeIndex, clampIndex, lastSlideIndex, releaseToCatalog, scrollToIndex])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isAnimating) return
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      if (isReleased) {
        return
      }
      if (activeIndex === lastSlideIndex) {
        releaseToCatalog()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex + 1)
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (isReleased) {
        const shopEl = shopSectionRef.current
        if (shopEl) {
          const shopRect = shopEl.getBoundingClientRect()
          const shopTopViewport = shopRect.top
          const returnThreshold = window.innerHeight + RETURN_THRESHOLD
          
          // Активируем кастомный скролл когда каталог уже ниже видимой области
          if (shopTopViewport >= returnThreshold) {
            event.preventDefault()
            returnToSlider()
          }
        }
        return
      }
      // Если на первом слайде — ничего не делаем
      if (activeIndex === 0) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      scrollToIndex(activeIndex - 1)
    }
  }, [activeIndex, isAnimating, isReleased, lastSlideIndex, releaseToCatalog, returnToSlider, scrollToIndex])

  // Wheel + touch listeners on window to avoid native scroll дергания
  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, handleTouchEnd, handleTouchStart, handleWheel])

  // Чистим таймер анимации при размонтировании
  useEffect(() => {
    return () => stopAnimationTimer()
  }, [stopAnimationTimer])

  // Возврат к видеостекам, если пользователь проскроллил выше каталога
  useEffect(() => {
    if (!isReleased) {
      isReturningFromFooterRef.current = false
      return
    }

    const handleScrollFromShop = () => {
      if (isReturningFromFooterRef.current) return

      const shopEl = shopSectionRef.current
      if (!shopEl) return

      const shopRect = shopEl.getBoundingClientRect()
      const shopTopViewport = shopRect.top
      const returnThreshold = window.innerHeight + RETURN_THRESHOLD

      // Активируем кастомный скролл когда каталог уже ниже видимой области
      if (shopTopViewport >= returnThreshold) {
        isReturningFromFooterRef.current = true
        returnToSlider()
        window.setTimeout(() => {
          isReturningFromFooterRef.current = false
        }, 280)
      }
    }

    window.addEventListener('scroll', handleScrollFromShop, { passive: true })
    return () => window.removeEventListener('scroll', handleScrollFromShop)
  }, [isReleased, returnToSlider])

  // Preload video metadata using link rel="preload" (more efficient than hidden DOM elements)
  useEffect(() => {
    const links: HTMLLinkElement[] = []
    
    videoSections.forEach((section, idx) => {
      // Preload first two видео с высоким приоритетом, остальные — фоном
      const isHighPriority = idx < 2
      
      // Preload WebM format (preferred)
      const webmLink = document.createElement('link')
      webmLink.rel = 'preload'
      webmLink.as = 'video'
      webmLink.href = section.videoSrc
      webmLink.type = 'video/webm'
      webmLink.setAttribute('fetchpriority', isHighPriority ? 'high' : 'low')
      document.head.appendChild(webmLink)
      links.push(webmLink)
      
      // Preload MP4 fallback
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
      // Cleanup preload links
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [])

  // Track first video readiness
  useEffect(() => {
    const videoWrapper = videoWrapperRef.current
    if (!videoWrapper) return

    const checkFirstVideoReady = () => {
      const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
      if (firstVideo && firstVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
        setIsFirstVideoReady(true)
        // Now enable scroll lock if needed
        if (!isReleased) {
          handleScrollLock(true)
        }
        return true
      }
      return false
    }

    // Check immediately
    if (checkFirstVideoReady()) return

    // Listen for video events
    const firstVideo = videoWrapper.querySelector('[data-section-index="0"] video') as HTMLVideoElement
    if (!firstVideo) return

    const handleReady = () => {
      setIsFirstVideoReady(true)
      if (!isReleased) {
        handleScrollLock(true)
      }
    }

    firstVideo.addEventListener('loadedmetadata', handleReady, { once: true })
    firstVideo.addEventListener('canplay', handleReady, { once: true })

    return () => {
      firstVideo.removeEventListener('loadedmetadata', handleReady)
      firstVideo.removeEventListener('canplay', handleReady)
    }
  }, [isReleased, handleScrollLock])

  // Header height variable + body scroll lock
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setHeaderHeight = () => {
      const header = document.querySelector('header')
      const h = header?.offsetHeight || 0
      document.documentElement.style.setProperty('--header-h', h + 'px')
    }

    setHeaderHeight()
    window.addEventListener('resize', setHeaderHeight)
    // Only lock scroll if first video is ready
    if (isFirstVideoReady) {
      handleScrollLock(true)
    }

    return () => {
      window.removeEventListener('resize', setHeaderHeight)
      handleScrollLock(false)
    }
  }, [handleScrollLock, isFirstVideoReady])

  // Hash-based navigation (/#catalog, /#shop, etc.)
  useEffect(() => {
    if (!location.hash) return
    const hash = location.hash.replace('#', '')

    const fallbackMap: Record<string, string> = {
      catalogue: 'catalog',
      magazin: 'catalog',
    }

    const targetId = fallbackMap[hash] || hash

    if (targetId === 'catalog') {
      releaseToCatalog()
      return
    }

    const targetIndex = videoSections.findIndex((section) => section.id === targetId)

    if (targetIndex >= 0) {
      if (isReleased) {
        returnToSlider(targetIndex)
      } else {
        scrollToIndex(targetIndex)
      }
    }
  }, [isReleased, location.hash, releaseToCatalog, returnToSlider, scrollToIndex])

  // Во время анимации:
  // При скролле вниз: fromIndex -> prev (остается), activeIndex -> next (выезжает снизу)
  // При скролле вверх: activeIndex -> prev (выезжает сверху), fromIndex -> next (уходит вниз)
  const visibleNextIndex = useMemo(() => {
    return direction === 'next'
      ? incomingIndex
      : (direction === 'prev' ? fromIndex : null)
  }, [direction, incomingIndex, fromIndex])
  
  const visiblePrevIndex = useMemo(() => {
    return direction === 'next'
      ? fromIndex
      : (direction === 'prev' ? incomingIndex : null)
  }, [direction, fromIndex, incomingIndex])

  return (
    <motion.div
      className={styles.home}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Video Sections Wrapper */}
      <div
        ref={videoWrapperRef}
        className={`${styles.videoSectionsWrapper} ${isReleased ? styles.released : ''}`}
        data-direction={direction || 'idle'}
      >
        {videoSections.map((section, index) => {
          // Во время анимации next имеет приоритет над active
          const isNext = visibleNextIndex === index
          const isPrev = visiblePrevIndex === index
          // active только если не next и не prev во время анимации
          const isActive = index === activeIndex && !isNext && !isPrev
          const nextVideoSrc = index < videoSections.length - 1 ? videoSections[index + 1].videoSrc : undefined

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

      {/* Uzel catalog preview */}
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <UzelPreview />
      </Suspense>

      {/* Каталог + футер в обычном скролле */}
      <div ref={shopSectionRef} id="catalog" className={styles.afterStack}>
        <Suspense fallback={<div style={{ minHeight: '600px' }} />}>
          <ShopShowcase />
        </Suspense>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>

      {/* Mobile Navigation Strip */}
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
        <button className={styles.mobileNavItem} data-section="catalog" onClick={releaseToCatalog}>
          Каталог
        </button>
      </nav>
    </motion.div>
  )
}
