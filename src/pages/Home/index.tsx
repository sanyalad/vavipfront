import { useVideoStack } from '@/hooks/useVideoStack'
import VideoSection from '@/components/animations/VideoSection'
import NavigationIndicator from '@/components/animations/NavigationIndicator'
import PeekIndicator from '@/components/animations/PeekIndicator'
import Footer from '@/components/layout/Footer'
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

export default function HomePage() {
  const {
    activeIndex,
    direction,
    isAnimating,
    isFooterOpen,
    sectionRefs,
    footerRef,
    goNext,
    goPrev,
    closeFooter,
  } = useVideoStack({ totalSections: videoSections.length })

  const isLastSection = activeIndex === videoSections.length - 1
  const showPeek = !isLastSection && !isFooterOpen

  return (
    <div className={styles.home}>
      {/* Video Sections Wrapper */}
      <div className={styles.videoSectionsWrapper}>
        {videoSections.map((section, index) => {
          const isLast = index === videoSections.length - 1
          const nextVideoSrc = index < videoSections.length - 1 ? videoSections[index + 1].videoSrc : undefined

          return (
            <VideoSection
              key={section.id}
              ref={(el) => {
                sectionRefs.current[index] = el
              }}
              {...section}
              index={index}
              isLast={isLast}
              isActive={index === activeIndex}
              isNext={index === activeIndex + 1}
              isPrev={index === activeIndex - 1}
              direction={direction}
              nextVideoSrc={nextVideoSrc}
            />
          )
        })}
      </div>

      {/* Navigation Indicator */}
      <NavigationIndicator
        currentIndex={activeIndex}
        totalSections={videoSections.length}
        onPrev={goPrev}
        onNext={goNext}
        isAnimating={isAnimating}
        isFooterOpen={isFooterOpen}
      />

      {/* Peek Indicator */}
      <PeekIndicator
        isVisible={showPeek}
        nextTitle={videoSections[activeIndex + 1]?.title || ''}
        onClick={goNext}
      />

      {/* Footer Overlay */}
      <Footer onClose={closeFooter} isOpen={isFooterOpen} />

      {/* Progress bar */}
      <div
        className={styles.progressBar}
        style={{
          width: `${((activeIndex + 1) / videoSections.length) * 100}%`,
        }}
      />

      {/* Section counter */}
      <div className={styles.sectionCounter}>
        <span className={styles.currentIndex}>{String(activeIndex + 1).padStart(2, '0')}</span>
        <span className={styles.separator}> / </span>
        <span>{String(videoSections.length).padStart(2, '0')}</span>
      </div>
    </div>
  )
}
