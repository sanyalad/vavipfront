import { forwardRef, useEffect, useImperativeHandle, useRef, useState, memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styles from './VideoSection.module.css'

interface VideoSectionProps {
  id: string
  title: string
  subtitle?: string
  videoSrc: string
  posterSrc?: string
  link: string
  index: number
  isLast?: boolean
  isActive?: boolean
  isNext?: boolean
  isPrev?: boolean
  direction: 'next' | 'prev' | null
  nextVideoSrc?: string
}

const VideoSection = forwardRef<HTMLElement, VideoSectionProps>(function VideoSection(
  {
    id,
    title,
    videoSrc,
    posterSrc,
    link,
    index,
    isLast = false,
    isActive = false,
    isNext = false,
    isPrev = false,
    direction,
    nextVideoSrc,
  },
  forwardedRef,
) {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [showCaption, setShowCaption] = useState(false)
  const nextVideoRef = useRef<boolean>(false)
  const primedRef = useRef(false)
  const isActiveRef = useRef(false)
  const activeSinceRef = useRef<number>(0) // Track when section became active

  useImperativeHandle(forwardedRef, () => sectionRef.current as HTMLElement)

  // Keep latest active flag for callbacks without re-creating them
  useEffect(() => {
    isActiveRef.current = !!isActive
  }, [isActive])

  const primeVideo = useCallback(() => {
    if (primedRef.current) return
    const video = videoRef.current
    if (!video) return

    primedRef.current = true
    video.preload = 'auto'
    // Force browser to fetch & decode a bit so первый показ не моргает
    try {
      video.load()
      // IMPORTANT: do not pause the *active* section video during priming;
      // otherwise the first section can stay paused until the next scroll/state change.
      if (!isActiveRef.current) {
        const playPromise = video.play()
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              if (!isActiveRef.current) {
                video.pause()
                video.currentTime = 0
              }
            })
            .catch(() => {})
        }
      }
    } catch (e) {
      // ignore play/load errors (e.g., Safari throttling)
    }
  }, [])

  // Track video readiness
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleCanPlay = () => {
      setIsVideoReady(true)
      // If this is the active section, start playback immediately
      if (isActiveRef.current && video.paused) {
        const p = video.play()
        if (p && typeof (p as Promise<void>).then === 'function') {
          ;(p as Promise<void>).catch(() => {})
        }
      }
    }

    const handleLoadedMetadata = () => {
      // Consider video ready if metadata is loaded (for faster initial check)
      if (!isVideoReady) {
        setIsVideoReady(true)
      }
      // If this is the active section, start playback immediately
      if (isActiveRef.current && video.paused) {
        const p = video.play()
        if (p && typeof (p as Promise<void>).then === 'function') {
          ;(p as Promise<void>).catch(() => {})
        }
      }
    }

    // Check if already loaded
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setIsVideoReady(true)
      // If already loaded and active, play immediately
      if (isActiveRef.current && video.paused) {
        const p = video.play()
        if (p && typeof (p as Promise<void>).then === 'function') {
          ;(p as Promise<void>).catch(() => {})
        }
      }
    }

    video.addEventListener('canplay', handleCanPlay, { once: true })
    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isVideoReady])

  // Track when section becomes active for preload optimization
  useEffect(() => {
    if (isActive) {
      if (activeSinceRef.current === 0) {
        activeSinceRef.current = performance.now()
      }
    } else {
      activeSinceRef.current = 0
    }
  }, [isActive])

  // Caption animation - faster response (copied from card-flip-navigator)
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setShowCaption(true)
      }, 200) // Reduced delay for faster response
      return () => clearTimeout(timer)
    } else {
      setShowCaption(false)
    }
  }, [isActive])

  // Play/pause video - simplified logic from card-flip-navigator
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Prime video on mount
    primeVideo()

    // Play video if active, pause otherwise
    if (isActive) {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.paused) {
        video.play().catch(() => {
          // Autoplay blocked, that's ok
        })
      }
    } else {
      if (!video.paused) {
        video.pause()
      }
    }
  }, [isActive, primeVideo])

  // Prime when секция появляется в viewport (даже если не активна)
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            primeVideo()
          }
        })
      },
      { threshold: 0.15 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [primeVideo])

  // Preload next video using link rel="preload".
  // OPTIMIZED: Only preload when section has been active for > 500ms to avoid performance issues during gestures
  useEffect(() => {
    if (!nextVideoSrc || isLast) return
    
    // Preload only when truly active for > 500ms (not during gestures)
    if (!isActive) return
    
    // Check if section has been active long enough
    const activeDuration = activeSinceRef.current > 0 
      ? performance.now() - activeSinceRef.current 
      : 0
    
    if (activeDuration < 500) {
      // Schedule preload after 500ms of being active
      const preloadTimer = window.setTimeout(() => {
        if (isActiveRef.current && nextVideoSrc) {
          preloadNextVideo()
        }
      }, 500 - activeDuration)
      
      return () => {
        window.clearTimeout(preloadTimer)
      }
    }
    
    // Section has been active > 500ms, preload immediately
    preloadNextVideo()
    
    return () => {
      // Cleanup - reset preload flag
      nextVideoRef.current = false
    }
  }, [isActive, nextVideoSrc, isLast])
  
  const preloadNextVideo = useCallback(() => {
    if (!nextVideoSrc || nextVideoRef.current) return // Already preloading or no next video
    
    // Use requestIdleCallback for non-critical preloading
    const preloadInIdle = (deadline?: IdleDeadline) => {
      if (deadline && deadline.timeRemaining() < 5) {
        // Not enough time, schedule for next idle period
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(preloadInIdle)
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(preloadInIdle, 100)
        }
        return
      }
      
      // Preload next video for smooth transitions
      // Using fetch() instead of <link rel="preload"> with 'as="video"' 
      // because some browsers don't support 'as="video"' for preload
      if (typeof fetch !== 'undefined') {
        // Prefetch videos in background using HEAD requests
        fetch(nextVideoSrc, { method: 'HEAD' } as RequestInit).catch(() => {})
        fetch(nextVideoSrc.replace('.webm', '.mp4'), { method: 'HEAD' } as RequestInit).catch(() => {})
      }

      // Mark as preloading
      nextVideoRef.current = true
    }
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(preloadInIdle)
    } else {
      // Fallback: preload immediately if requestIdleCallback not available
      preloadInIdle()
    }
  }, [nextVideoSrc])

  const sectionClasses = [
    styles.videoSection,
    'video-section',
    isActive && styles.active,
    isPrev && styles.prev,
    isNext && styles.next,
    isLast && styles.lastSection,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      ref={sectionRef}
      id={id}
      className={sectionClasses}
      aria-labelledby={`caption-${index}`}
      data-video-section
      data-section-index={index}
      data-state={isActive ? 'active' : isPrev ? 'prev' : isNext ? 'next' : 'idle'}
      data-direction={direction || 'idle'}
      data-video-ready={isVideoReady}
      data-is-next={isNext ? 'true' : 'false'}
      data-is-prev={isPrev ? 'true' : 'false'}
      data-is-last={isLast ? 'true' : 'false'}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        poster={posterSrc}
        disablePictureInPicture
        controls={false}
      >
        <source src={videoSrc} type="video/webm" />
        <source src={videoSrc.replace('.webm', '.mp4')} type="video/mp4" />
        {posterSrc && <img src={posterSrc} alt={`Фон: ${title}`} className={styles.videoPoster} />}
      </video>

      <h2 
        id={`caption-${index}`} 
        className={styles.videoCaption}
        style={{
          opacity: showCaption ? 1 : 0,
          transform: showCaption 
            ? 'translate3d(-50%, 0, 0)' 
            : 'translate3d(-50%, 30px, 0)',
          transition: 'opacity 0.8s ease, transform 0.6s ease',
        }}
      >
        {title}
      </h2>

      <Link
        className={styles.sectionLink}
        to={link}
        aria-label={`Перейти к разделу ${title}`}
      />
    </section>
  )
})

// Memoize component to prevent unnecessary re-renders
const MemoizedVideoSection = memo(VideoSection)
export default MemoizedVideoSection
