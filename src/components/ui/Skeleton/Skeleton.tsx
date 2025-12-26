import { motion } from 'framer-motion'
import styles from './Skeleton.module.css'
import clsx from 'clsx'

interface SkeletonProps {
  /** Width of the skeleton (e.g., '100%', '200px') */
  width?: string | number
  /** Height of the skeleton (e.g., '20px', '100%') */
  height?: string | number
  /** Border radius (e.g., '4px', '50%') */
  borderRadius?: string | number
  /** Additional className */
  className?: string
  /** Variant type */
  variant?: 'text' | 'rectangular' | 'circular'
  /** Animation type */
  animation?: 'shimmer' | 'pulse' | 'none'
}

/**
 * Skeleton loading component with shimmer effect
 */
export function Skeleton({
  width,
  height,
  borderRadius,
  className,
  variant = 'rectangular',
  animation = 'shimmer',
}: SkeletonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          width: width || '100%',
          height: height || '1em',
          borderRadius: borderRadius || '4px',
        }
      case 'circular':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
        }
      case 'rectangular':
      default:
        return {
          width: width || '100%',
          height: height || '100px',
          borderRadius: borderRadius || '8px',
        }
    }
  }

  return (
    <div
      className={clsx(
        styles.skeleton,
        animation === 'shimmer' && styles.shimmer,
        animation === 'pulse' && styles.pulse,
        className
      )}
      style={getVariantStyles()}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton for product cards
 */
export function ProductCardSkeleton() {
  return (
    <motion.div
      className={styles.productCard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.productImageWrapper}>
        <Skeleton variant="rectangular" height="100%" />
      </div>
      <div className={styles.productContent}>
        <Skeleton variant="text" width="80%" height="14px" />
        <Skeleton variant="text" width="50%" height="14px" />
      </div>
    </motion.div>
  )
}

/**
 * Grid of product card skeletons
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ProductCardSkeleton />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Skeleton for list items (e.g., orders)
 */
export function ListItemSkeleton() {
  return (
    <motion.div
      className={styles.listItem}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Skeleton variant="circular" width="48px" height="48px" />
      <div className={styles.listItemContent}>
        <Skeleton variant="text" width="60%" height="16px" />
        <Skeleton variant="text" width="40%" height="14px" />
      </div>
      <Skeleton variant="text" width="80px" height="20px" />
    </motion.div>
  )
}

/**
 * Skeleton for order list
 */
export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.orderList}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <ListItemSkeleton />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Full page skeleton with multiple sections
 */
export function PageSkeleton() {
  return (
    <div className={styles.page}>
      {/* Header skeleton */}
      <div className={styles.pageHeader}>
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="text" width="300px" height="16px" />
      </div>
      
      {/* Content skeleton */}
      <div className={styles.pageContent}>
        <Skeleton variant="rectangular" height="200px" />
        <div className={styles.pageGrid}>
          <Skeleton variant="rectangular" height="150px" />
          <Skeleton variant="rectangular" height="150px" />
          <Skeleton variant="rectangular" height="150px" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton


