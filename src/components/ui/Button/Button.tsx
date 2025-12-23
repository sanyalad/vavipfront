import { forwardRef, ReactNode, useState, useCallback } from 'react'
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
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

// Spring configuration for natural, bouncy animations
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
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
        
        setRipples(prev => [...prev, { id, x, y }])
        
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
          scale: 1.03,
          y: -2,
          boxShadow: variant === 'primary' 
            ? '0 8px 25px rgba(255, 255, 255, 0.15)' 
            : '0 8px 20px rgba(0, 0, 0, 0.2)',
        }}
        whileTap={isDisabled ? {} : { 
          scale: 0.97, 
          y: 0,
        }}
        transition={springConfig}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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

