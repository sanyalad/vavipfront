import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { productsApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import { fallbackProducts } from '@/data/fallbackProducts'
import styles from './Shop.module.css'

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
            <div className={styles.grid}>
              {displayProducts?.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true, amount: 0.35 }}
                >
                  <Link to={`/shop/product/${product.slug}`} className={styles.cardLink}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardImage}>
                        {product.main_image ? (
                          <img
                            src={getImageUrl(product.main_image, product.slug) || product.main_image}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              // Fallback to API image if public PNG doesn't exist
                              const target = e.target as HTMLImageElement
                              if (target.src !== product.main_image) {
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
                      </div>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardTitle}>{product.name}</div>
                      <div className={styles.cardFooter}>
                        <div className={styles.price}>
                          <span className={styles.currentPrice}>
                            {product.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <motion.button
                    type="button"
                    className={styles.addButton}
                    aria-label={product.stock_quantity === 0 ? 'Нет в наличии' : 'Добавить в корзину'}
                    disabled={product.stock_quantity === 0}
                    whileTap={{ scale: 0.92, rotate: 10 }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddToCart(product)
                    }}
                  >
                    <span className={styles.addPlus}>+</span>
                  </motion.button>
                </motion.div>
              ))}
            </div>

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

