import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { productsApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import { getFallbackProductBySlug } from '@/data/fallbackProducts'
import styles from './Product.module.css'

export default function ProductPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState<'about' | 'spec'>('about')
  const { addItem, openCart } = useCartStore()

  const fallbackProduct = useMemo(() => {
    if (!slug) return null
    return getFallbackProductBySlug(slug)
  }, [slug])

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProduct(slug!),
    enabled: !!slug,
  })

  if (isLoading && !fallbackProduct) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  const resolvedProduct = product || fallbackProduct

  if ((error || !resolvedProduct) && !fallbackProduct) {
    return (
      <div className={styles.error}>
        <h1>Товар не найден</h1>
        <p>К сожалению, запрашиваемый товар не существует.</p>
      </div>
    )
  }

  const handleAddToCart = () => {
    if (!resolvedProduct) return
    addItem(resolvedProduct, quantity)
    openCart()
  }

  const handleBuyOneClick = () => {
    if (!resolvedProduct) return
    addItem(resolvedProduct, quantity)
    navigate('/checkout')
  }

  const images = resolvedProduct?.images || []
  const mainImage = images[selectedImage]?.url || resolvedProduct?.main_image
  const skuLabel = useMemo(() => {
    if (!resolvedProduct?.sku) return null
    return String(resolvedProduct.sku).toUpperCase()
  }, [resolvedProduct?.sku])

  return (
    <motion.div
      className={styles.product}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.pdp}>
        <div className={styles.pdpLayout}>
          {/* Gallery (left) */}
          <div className={styles.galleryArea}>
            <div className={styles.galleryFrame}>
              {mainImage ? (
                <img className={styles.galleryImage} src={mainImage} alt={resolvedProduct?.name || 'Товар'} />
              ) : (
                <div className={styles.placeholder}>Нет изображения</div>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.thumbnails} aria-label="Галерея">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`${styles.thumbnail} ${index === selectedImage ? styles.thumbnailActive : ''}`}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`Изображение ${index + 1}`}
                  >
                    <img src={img.url} alt="" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details (right) */}
          <aside className={styles.detailsArea} aria-label="Информация о товаре">
            <div className={styles.detailsInner}>
              <div className={styles.metaTop}>
                <span className={styles.metaLine}>{resolvedProduct?.category?.name || 'Каталог'}</span>
                {skuLabel && <span className={styles.metaCode}>{skuLabel}</span>}
              </div>

              <h1 className={styles.title}>{resolvedProduct?.name}</h1>

              <div className={styles.priceRow}>
                <span className={styles.currentPrice}>{resolvedProduct?.price?.toLocaleString('ru-RU')} ₽</span>
                {resolvedProduct?.old_price && (
                  <span className={styles.oldPrice}>{resolvedProduct.old_price.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>

              <div className={styles.actionsRow}>
                <div className={styles.qty}>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Уменьшить количество"
                  >
                    −
                  </button>
                  <span aria-label="Количество">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Увеличить количество">
                    +
                  </button>
                </div>

                <div className={styles.buyWrap}>
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleAddToCart}
                    disabled={!!resolvedProduct && resolvedProduct.stock_quantity === 0}
                    className={styles.buyPrimary}
                  >
                    {!!resolvedProduct && resolvedProduct.stock_quantity === 0 ? 'Нет в наличии' : 'В корзину'}
                  </Button>

                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={handleBuyOneClick}
                    className={styles.buyOneClick}
                    disabled={!!resolvedProduct && resolvedProduct.stock_quantity === 0}
                  >
                    Купить в 1 клик
                  </Button>
                </div>
              </div>

              <div className={styles.tabs} role="tablist" aria-label="Информация">
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('about')}
                  role="tab"
                  aria-selected={activeTab === 'about'}
                >
                  Описание
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'spec' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('spec')}
                  role="tab"
                  aria-selected={activeTab === 'spec'}
                >
                  Характеристики
                </button>
              </div>

              {activeTab === 'about' ? (
                <div className={styles.tabPanel} role="tabpanel">
                  {resolvedProduct?.description ? (
                    <div dangerouslySetInnerHTML={{ __html: resolvedProduct.description }} />
                  ) : (
                    <p className={styles.muted}>Описание появится позже.</p>
                  )}
                </div>
              ) : (
                <div className={styles.tabPanel} role="tabpanel">
                  {resolvedProduct?.attributes && resolvedProduct.attributes.length > 0 ? (
                    <dl className={styles.specList}>
                      {resolvedProduct.attributes.map((attr) => (
                        <div key={attr.id} className={styles.specRow}>
                          <dt>{attr.name}</dt>
                          <dd>{attr.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className={styles.muted}>Характеристики появятся позже.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  )
}






