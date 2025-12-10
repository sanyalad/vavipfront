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

  useImperativeHandle(forwardedRef, () => sectionRef.current as HTMLElement)

  const primeVideo = useCallback(() => {
    if (primedRef.current) return
    const video = videoRef.current
    if (!video) return

    primedRef.current = true
    video.preload = 'auto'
    // Force browser to fetch & decode a bit so первый показ не моргает
    try {
      video.load()
      const playPromise = video.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            video.pause()
            video.currentTime = 0
          })
          .catch(() => {})
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
    }

    const handleLoadedMetadata = () => {
      // Consider video ready if metadata is loaded (for faster initial check)
      if (!isVideoReady) {
        setIsVideoReady(true)
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
      // Only play if video is ready, otherwise wait
      if (isVideoReady || video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        video.play().catch(() => {})
      }
    } else {
      video.pause()
    }
  }, [isActive, isVideoReady])

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

  // Preload next video using link rel="preload" when current is active or visible
  useEffect(() => {
    if (!nextVideoSrc || isLast) return
    
    // Preload if active, next, or prev (visible in viewport)
    if (!isActive && !isNext && !isPrev) return

    // Use link rel="preload" instead of hidden DOM elements (more efficient)
    const webmLink = document.createElement('link')
    webmLink.rel = 'preload'
    webmLink.as = 'video'
    webmLink.href = nextVideoSrc
    webmLink.type = 'video/webm'
    webmLink.setAttribute('fetchpriority', 'high')
    document.head.appendChild(webmLink)
    
    const mp4Link = document.createElement('link')
    mp4Link.rel = 'preload'
    mp4Link.as = 'video'
    mp4Link.href = nextVideoSrc.replace('.webm', '.mp4')
    mp4Link.type = 'video/mp4'
    mp4Link.setAttribute('fetchpriority', 'high')
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
  }, [isActive, isNext, isPrev, nextVideoSrc, isLast])

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
