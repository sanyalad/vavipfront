import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import Button from '@/components/ui/Button'
import styles from './CartSidebar.module.css'

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore()
  const total = totalPrice()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Sidebar */}
          <motion.aside
            className={styles.sidebar}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Корзина</h2>
              <button className={styles.closeButton} onClick={closeCart}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {items.length === 0 ? (
              <div className={styles.empty}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <p>Корзина пуста</p>
                <Link to="/catalog/uzel-vvoda" onClick={closeCart}>
                  <Button variant="outline">Перейти в каталог</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.items}>
                  {items.map((item) => (
                    <div key={item.product.id} className={styles.item}>
                      <div className={styles.itemImage}>
                        {item.product.main_image ? (
                          <img src={item.product.main_image} alt={item.product.name} />
                        ) : (
                          <div className={styles.placeholder} />
                        )}
                      </div>
                      <div className={styles.itemInfo}>
                        <Link 
                          to={`/shop/product/${item.product.slug}`} 
                          className={styles.itemName}
                          onClick={closeCart}
                        >
                          {item.product.name}
                        </Link>
                        <p className={styles.itemPrice}>
                          {item.product.price.toLocaleString('ru-RU')} ₽
                        </p>
                        <div className={styles.quantity}>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeItem(item.product.id)}
                        aria-label="Удалить"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className={styles.footer}>
                  <div className={styles.total}>
                    <span>Итого:</span>
                    <span>{total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className={styles.actions}>
                    <Button variant="ghost" onClick={clearCart}>
                      Очистить
                    </Button>
                    <Link to="/checkout" onClick={closeCart}>
                      <Button fullWidth>Оформить заказ</Button>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}


