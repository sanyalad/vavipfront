import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { productsApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import { fallbackProducts } from '@/data/fallbackProducts'
import styles from './Shop.module.css'

// Animation variants for stagger effect
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

// Hover animation for cards
const cardHoverVariants = {
  rest: {
    y: 0,
    boxShadow: '0 0 0 rgba(255, 255, 255, 0)',
  },
  hover: {
    y: -8,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
}

export default function ShopPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const { addItem, openCart } = useCartStore()
  const lastAddedIdRef = useRef<number | null>(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { page, search, category }],
    queryFn: () => productsApi.getProducts({ page, search, category, per_page: 12 }),
  })

  // Use fallback products if API returns empty or no data
  const displayProducts = useMemo(() => {
    if (productsData?.products && productsData.products.length > 0) {
      return productsData
    }
    // Return fallback products formatted as API response
    const shopProducts = fallbackProducts.filter(p => p.id >= 910000) // Only shop products (IDs >= 910000)
    return {
      products: shopProducts,
      current_page: 1,
      pages: 1,
      has_next: false,
      has_prev: false,
      total: shopProducts.length,
    }
  }, [productsData])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  })

  const currentCategoryName = useMemo(() => {
    if (!category) return null
    const found = categories?.find((c: any) => c.slug === category)
    return found?.name || null
  }, [categories, category])

  const handleAddToCart = (product: any) => {
    addItem(product)
    openCart()
    lastAddedIdRef.current = product.id
  }

  // Try to load PNG from public/images/products/ first, then fallback to API image
  const getImageUrl = (imageUrl: string | null | undefined, productSlug?: string) => {
    if (!imageUrl) return null
    // If it's already a full URL, use it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    // Try to find in public/images/products/ first
    if (productSlug) {
      // Priority: PNG -> API image
      const publicPath = `/images/products/${productSlug}.png`
      return publicPath
    }
    return imageUrl
  }

  return (
    <motion.div
      className={styles.shop}
      id="catalog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        {/* Hero */}
        <header className={styles.hero} aria-label="Каталог">
          <div className={styles.heroInner}>
            <h1 className={styles.title}>{currentCategoryName || 'Магазин'}</h1>
            <p className={styles.subtitle}>Инженерное оборудование</p>

            <div className={styles.controls} aria-label="Фильтры каталога">
              <div className={styles.search}>
                <input
                  className={styles.searchInput}
                  placeholder="ПОИСК"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className={styles.searchIcon} aria-hidden="true" />
              </div>
            </div>
          </div>
        </header>

        {/* Categories Grid */}
        {categories && categories.length > 0 && (
          <nav className={styles.categoriesNav} aria-label="Категории">
            <div className={styles.categoriesGrid}>
              <button
                type="button"
                className={`${styles.categoryTile} ${!category ? styles.categoryTileActive : ''}`}
                onClick={() => setCategory('')}
              >
                ВСЕ ТОВАРЫ
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryTile} ${category === cat.slug ? styles.categoryTileActive : ''}`}
                  onClick={() => setCategory(cat.slug)}
                >
                  {String(cat.name || '').toUpperCase()}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <>
            <motion.div 
              className={styles.grid}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {displayProducts?.products.map((product) => (
                  <motion.div
                    key={product.id}
                    className={styles.card}
                    variants={cardVariants}
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    layout
                  >
                    <motion.div
                      className={styles.cardInner}
                      variants={cardHoverVariants}
                    >
                      <Link to={`/shop/product/${product.slug}`} className={styles.cardLink}>
                        <div className={styles.cardTop}>
                          <motion.div 
                            className={styles.cardImage}
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            {product.main_image ? (
                              <motion.img
                                src={getImageUrl(product.main_image, product.slug) || product.main_image || ''}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                onError={(e) => {
                                  // Fallback to API image if public PNG doesn't exist
                                  const target = e.target as HTMLImageElement
                                  if (product.main_image && target.src !== product.main_image) {
                                    target.src = product.main_image
                                  }
                                }}
                              />
                            ) : (
                              <div className={styles.placeholder}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                              </div>
                            )}
                          </motion.div>
                        </div>
                        <div className={styles.cardContent}>
                          <motion.div 
                            className={styles.cardTitle}
                            whileHover={{ color: 'rgba(255, 255, 255, 1)' }}
                          >
                            {product.name}
                          </motion.div>
                          <div className={styles.cardFooter}>
                            <motion.div 
                              className={styles.price}
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: 'spring', stiffness: 400 }}
                            >
                              <span className={styles.currentPrice}>
                                {product.price.toLocaleString('ru-RU')} ₽
                              </span>
                            </motion.div>
                          </div>
                        </div>
                      </Link>

                      <motion.button
                        type="button"
                        className={styles.addButton}
                        aria-label={product.stock_quantity === 0 ? 'Нет в наличии' : 'Добавить в корзину'}
                        disabled={product.stock_quantity === 0}
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        whileHover={{ 
                          scale: 1.15, 
                          boxShadow: '0 8px 25px rgba(255, 255, 255, 0.15)',
                        }}
                        whileTap={{ scale: 0.9, rotate: 15 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAddToCart(product)
                        }}
                      >
                        <span className={styles.addPlus}>+</span>
                      </motion.button>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {displayProducts && displayProducts.pages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!displayProducts.has_prev}
                >
                  Назад
                </Button>
                <span className={styles.pageInfo}>
                  Страница {displayProducts.current_page} из {displayProducts.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!displayProducts.has_next}
                >
                  Вперед
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

