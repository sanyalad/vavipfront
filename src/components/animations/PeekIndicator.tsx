import styles from './PeekIndicator.module.css'

interface PeekIndicatorProps {
  isVisible: boolean;
  nextTitle: string;
  onClick: () => void;
}

const PeekIndicator = ({ isVisible, nextTitle, onClick }: PeekIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className={styles.peekIndicator}
    >
      <span className={styles.nextTitle}>
        {nextTitle}
      </span>
      <svg 
        className={styles.arrow}
        width="16" 
        height="16" 
        viewBox="0 0 16 16" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 12L4 8L8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 8 8)"/>
      </svg>
    </button>
  );
};

export default PeekIndicator;

