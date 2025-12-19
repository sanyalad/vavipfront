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
  const nextVideoRef = useRef<{ webmLink: HTMLLinkElement; mp4Link: HTMLLinkElement } | null>(null)
  const primedRef = useRef(false)
  const isActiveRef = useRef(false)
  const lastPlayedActiveIndexRef = useRef<number | null>(null)
  const lastPlayedTimestampRef = useRef<number>(0)

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
      // If this is the active section, try to start playback immediately on readiness.
      if (isActiveRef.current) {
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
      // If this is the active section, try to start playback immediately on readiness.
      if (isActiveRef.current) {
        const p = video.play()
        if (p && typeof (p as Promise<void>).then === 'function') {
          ;(p as Promise<void>).catch(() => {})
        }
      }
      
    }

    // Check if already loaded
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setIsVideoReady(true)
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isVideoReady])

  // Play/pause video based on active state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Предвзводим видео как только секция смонтировалась
    primeVideo()

    if (isActive) {
      // CRITICAL: Check if video is already playing to avoid unnecessary play() calls
      // that can cause stuttering and double activation
      // CRITICAL: Also check if we already played for this activeIndex to prevent double activation after snap back
      // This prevents re-activation when isActive changes twice (once in scrollToIndex, once after animation/snap back)
      // CRITICAL: Also check timestamp to prevent double activation within short time window (e.g., 500ms)
      // BUT: If video was paused (e.g., after snap back), allow play even if timeSinceLastPlay < 1000ms
      // This prevents video from not playing after snap back when isActive becomes true again
      const now = performance.now()
      const timeSinceLastPlay = now - lastPlayedTimestampRef.current
      // Allow play if: video is paused AND (lastPlayedIndex is different OR enough time passed OR video was paused)
      // The "video.paused" check ensures we can restart video after snap back even if timeSinceLastPlay < 1000ms
      const shouldPlayVideo = video.paused && (lastPlayedActiveIndexRef.current !== index || timeSinceLastPlay > 500 || video.currentTime === 0)
      
      if (shouldPlayVideo) {
        lastPlayedActiveIndexRef.current = index
        lastPlayedTimestampRef.current = now
        const p = video.play()
        if (p && typeof (p as Promise<void>).then === 'function') {
          ;(p as Promise<void>)
            .then(() => {
              
            })
            .catch((_err: any) => {
              
            })
        }
      }
    } else {
      // CRITICAL: Reset lastPlayedActiveIndexRef when section becomes inactive
      // This allows video to play again when section becomes active again (e.g., after scrolling back)
      // BUT: Only reset if enough time has passed to prevent double activation during rapid isActive changes
      // CRITICAL: Also check if video is actually paused to prevent reset during snap back
      // CRITICAL: Reset immediately if video is paused and currentTime is 0 (video was reset)
      const now = performance.now()
      const timeSinceLastPlay = now - lastPlayedTimestampRef.current
      if (lastPlayedActiveIndexRef.current === index && video.paused && (timeSinceLastPlay > 1000 || video.currentTime === 0)) {
        lastPlayedActiveIndexRef.current = null
        
      }
      // Only pause if video is actually playing to avoid unnecessary operations
      if (!video.paused) {
        video.pause()
      }
    }
  }, [isActive, isVideoReady, primeVideo])

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
  // IMPORTANT: avoid doing this during long trackpad gestures (isNext/isPrev), because it can trigger
  // aggressive network/decoding work and make trackpad scrolling feel "heavy".
  useEffect(() => {
    if (!nextVideoSrc || isLast) return
    
    // Preload only when truly active (short + predictable), not while gesture-following.
    if (!isActive) return

    // Use link rel="preload" instead of hidden DOM elements (more efficient)
    const webmLink = document.createElement('link')
    webmLink.rel = 'preload'
    webmLink.as = 'video'
    webmLink.href = nextVideoSrc
    webmLink.type = 'video/webm'
    webmLink.setAttribute('fetchpriority', 'low')
    document.head.appendChild(webmLink)
    
    const mp4Link = document.createElement('link')
    mp4Link.rel = 'preload'
    mp4Link.as = 'video'
    mp4Link.href = nextVideoSrc.replace('.webm', '.mp4')
    mp4Link.type = 'video/mp4'
    mp4Link.setAttribute('fetchpriority', 'low')
    document.head.appendChild(mp4Link)

    // Store references for cleanup
    nextVideoRef.current = { webmLink, mp4Link }

    return () => {
      // Cleanup preload links
      if (nextVideoRef.current) {
        const { webmLink, mp4Link } = nextVideoRef.current
        if (webmLink?.parentNode) {
          webmLink.parentNode.removeChild(webmLink)
        }
        if (mp4Link?.parentNode) {
          mp4Link.parentNode.removeChild(mp4Link)
        }
        nextVideoRef.current = null
      }
    }
  }, [isActive, nextVideoSrc, isLast])

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

      <h2 id={`caption-${index}`} className={styles.videoCaption}>
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
