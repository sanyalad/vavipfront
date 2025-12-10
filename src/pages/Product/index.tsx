import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { productsApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import styles from './Product.module.css'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { addItem, openCart } = useCartStore()

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProduct(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <h1>Товар не найден</h1>
        <p>К сожалению, запрашиваемый товар не существует.</p>
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem(product, quantity)
    openCart()
  }

  const images = product.images || []
  const mainImage = images[selectedImage]?.url || product.main_image

  return (
    <motion.div
      className={styles.product}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {mainImage ? (
                <img src={mainImage} alt={product.name} />
              ) : (
                <div className={styles.placeholder}>Нет изображения</div>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.thumbnails}>
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    className={`${styles.thumbnail} ${index === selectedImage ? styles.active : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img.url} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            {product.category && (
              <span className={styles.category}>{product.category.name}</span>
            )}
            <h1 className={styles.title}>{product.name}</h1>
            
            {product.sku && (
              <p className={styles.sku}>Артикул: {product.sku}</p>
            )}

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

            <div className={styles.stock}>
              {product.stock_quantity > 0 ? (
                <span className={styles.inStock}>В наличии</span>
              ) : (
                <span className={styles.outOfStock}>Нет в наличии</span>
              )}
            </div>

            {product.short_description && (
              <p className={styles.shortDescription}>{product.short_description}</p>
            )}

            <div className={styles.actions}>
              <div className={styles.quantity}>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}>+</button>
              </div>
              <Button
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
              >
                Добавить в корзину
              </Button>
            </div>

            {/* Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <div className={styles.attributes}>
                <h3>Характеристики</h3>
                <dl>
                  {product.attributes.map((attr) => (
                    <div key={attr.id} className={styles.attribute}>
                      <dt>{attr.name}</dt>
                      <dd>{attr.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className={styles.description}>
            <h2>Описание</h2>
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}


