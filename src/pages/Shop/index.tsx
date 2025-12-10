import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { productsApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './Shop.module.css'

export default function ShopPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const { addItem, openCart } = useCartStore()

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { page, search, category }],
    queryFn: () => productsApi.getProducts({ page, search, category, per_page: 12 }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  })

  const handleAddToCart = (product: any) => {
    addItem(product)
    openCart()
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
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Магазин</h1>
          <p className={styles.subtitle}>Премиальное оборудование для инженерных систем</p>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <Input
            placeholder="Поиск товаров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            }
          />
          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <>
            <div className={styles.grid}>
              {productsData?.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true, amount: 0.35 }}
                >
                  <Link to={`/shop/product/${product.slug}`} className={styles.cardImage}>
                    {product.main_image ? (
                      <img
                        src={product.main_image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
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
                    {product.old_price && (
                      <span className={styles.badge}>Скидка</span>
                    )}
                  </Link>
                  <div className={styles.cardContent}>
                    <Link to={`/shop/product/${product.slug}`} className={styles.cardTitle}>
                      {product.name}
                    </Link>
                    {product.short_description && (
                      <p className={styles.cardDescription}>{product.short_description}</p>
                    )}
                    <div className={styles.cardFooter}>
                      <div className={styles.price}>
                        <span className={styles.currentPrice}>
                          {product.price.toLocaleString('ru-RU')} ₽
                        </span>
                        {product.old_price && (
                          <span className={styles.oldPrice}>
                            {product.old_price.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_quantity === 0}
                      >
                        {product.stock_quantity === 0 ? 'Нет в наличии' : 'В корзину'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {productsData && productsData.pages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!productsData.has_prev}
                >
                  Назад
                </Button>
                <span className={styles.pageInfo}>
                  Страница {productsData.current_page} из {productsData.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!productsData.has_next}
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

