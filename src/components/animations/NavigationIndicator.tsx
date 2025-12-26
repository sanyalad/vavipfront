import styles from './NavigationIndicator.module.css'

interface NavigationIndicatorProps {
  currentIndex: number;
  totalSections: number;
  onPrev: () => void;
  onNext: () => void;
  isAnimating: boolean;
  isFooterOpen: boolean;
}

const NavigationIndicator = ({
  currentIndex,
  totalSections,
  onPrev,
  onNext,
  isAnimating,
  isFooterOpen,
}: NavigationIndicatorProps) => {
  if (isFooterOpen) return null;

  return (
    <div className={styles.navigationIndicator}>
      {/* Up button */}
      <button
        onClick={onPrev}
        disabled={currentIndex === 0 || isAnimating}
        className={styles.navButton}
        aria-label="Previous section"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 10L10 5L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dots */}
      <div className={styles.dots}>
        {Array.from({ length: totalSections }).map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
          />
        ))}
      </div>

      {/* Down button */}
      <button
        onClick={onNext}
        disabled={currentIndex === totalSections - 1 || isAnimating}
        className={styles.navButton}
        aria-label="Next section"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 10L10 15L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

export default NavigationIndicator;

