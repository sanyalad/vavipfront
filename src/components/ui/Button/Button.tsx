import { forwardRef, ReactNode } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
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
      ...props
    },
    ref
  ) => {
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
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        {...props}
      >
        {isLoading && (
          <span className={styles.spinner}>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        )}
        {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        <span className={styles.text}>{children}</span>
        {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button

