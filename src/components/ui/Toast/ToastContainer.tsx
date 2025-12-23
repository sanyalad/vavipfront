import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import styles from './Toast.module.css'

// Spring configuration for natural animations
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
}

// Animated checkmark SVG component
function AnimatedCheckmark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.polyline
        points="9,12 11,14 15,10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

// Animated error X SVG
function AnimatedError() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.line
        x1="15"
        y1="9"
        x2="9"
        y2="15"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.3, ease: 'easeOut' }}
      />
      <motion.line
        x1="9"
        y1="9"
        x2="15"
        y2="15"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

// Animated warning triangle
function AnimatedWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      />
      <motion.line
        x1="12"
        y1="17"
        x2="12.01"
        y2="17"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
      />
    </svg>
  )
}

// Animated info icon
function AnimatedInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.line
        x1="12"
        y1="16"
        x2="12"
        y2="12"
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      />
      <motion.circle
        cx="12"
        cy="8"
        r="0.5"
        fill="currentColor"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 500 }}
      />
    </svg>
  )
}

// Toast duration for auto-dismiss (ms)
const TOAST_DURATION = 5000

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  const content = (
    <div className={styles.container}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ 
              opacity: 0, 
              x: 100, 
              scale: 0.9,
              transition: { duration: 0.2 }
            }}
            transition={springConfig}
            layout
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className={styles.icon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...springConfig, delay: 0.1 }}
            >
              {toast.type === 'success' && <AnimatedCheckmark />}
              {toast.type === 'error' && <AnimatedError />}
              {toast.type === 'warning' && <AnimatedWarning />}
              {toast.type === 'info' && <AnimatedInfo />}
            </motion.div>
            
            <motion.p 
              className={styles.message}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {toast.message}
            </motion.p>
            
            <motion.button
              className={styles.close}
              onClick={() => removeToast(toast.id)}
              aria-label="Закрыть"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.button>
            
            {/* Progress bar for auto-dismiss */}
            <motion.div 
              className={styles.progressBar}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: TOAST_DURATION / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return createPortal(content, document.body)
}











