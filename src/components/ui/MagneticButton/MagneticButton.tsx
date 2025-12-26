import { forwardRef } from 'react'
import Button from '../Button/Button'
import type { ButtonProps } from '../Button/Button'
import clsx from 'clsx'
import styles from './MagneticButton.module.css'

interface MagneticButtonProps extends Omit<ButtonProps, 'className' | 'variant'> {
  magneticStrength?: number
  className?: string
  variant?: 'pill' | 'pill-outline' | 'primary' | 'secondary' | 'outline' | 'ghost'
}

export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  (
    {
      children,
      className,
      variant = 'pill',
      ...props
    },
    ref
  ) => {

    // Map variant names to Button component variants
    const buttonVariant: ButtonProps['variant'] = 
      variant === 'pill-outline' ? 'outline' : 
      variant === 'pill' ? 'primary' : 
      variant

    return (
      <Button
        ref={ref}
        className={clsx(styles.magneticButton, styles[variant], className)}
        variant={buttonVariant}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

MagneticButton.displayName = 'MagneticButton'

