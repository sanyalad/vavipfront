import { forwardRef, ReactNode, useState, useCallback } from 'react'
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children?: ReactNode
  /** Enable ripple effect on click */
  enableRipple?: boolean
}

// Optimized spring configuration for better performance
const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.5,
}

// Lightweight transition for hover/tap (no spring physics)
const quickTransition = {
  type: 'tween' as const,
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const,
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      enableRipple = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
    
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return
      
      if (enableRipple) {
        const button = e.currentTarget
        const rect = button.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = Date.now()
        
        setRipples(prev => {
          // Limit to max 3 ripples at once for performance
          const newRipples = [...prev, { id, x, y }]
          return newRipples.slice(-3)
        })
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id))
        }, 600)
      }
      
      onClick?.(e)
    }, [disabled, enableRipple, isLoading, onClick])
    
    const isDisabled = disabled || isLoading
    
    return (
      <motion.button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          fullWidth && styles.fullWidth,
          isLoading && styles.loading,
          className
        )}
        disabled={isDisabled}
        onClick={handleClick}
        whileHover={isDisabled ? {} : { 
          scale: 1.02,
          y: -1,
        }}
        whileTap={isDisabled ? {} : { 
          scale: 0.98, 
          y: 0,
        }}
        transition={quickTransition}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout="position"
        {...props}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              className={styles.ripple}
              style={{ left: ripple.x, top: ripple.y }}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.span 
            className={styles.spinner}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </motion.span>
        )}
        {!isLoading && leftIcon && (
          <motion.span 
            className={styles.icon}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springConfig, delay: 0.05 }}
          >
            {leftIcon}
          </motion.span>
        )}
        <motion.span 
          className={styles.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.1 }}
        >
          {children}
        </motion.span>
        {!isLoading && rightIcon && (
          <motion.span 
            className={styles.icon}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springConfig, delay: 0.15 }}
          >
            {rightIcon}
          </motion.span>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button

