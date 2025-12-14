import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import styles from './UzelCatalog.module.css'
import { uzelCategories } from '@/data/uzelCatalog'
import { useCartStore } from '@/store/cartStore'
import { getFallbackProductBySlug } from '@/data/fallbackProducts'

const placeholderProducts = [
  {
    slug: 'v01-meter',
    title: 'V01 | Узел с счетчиком',
    category: 'with-meter',
    desc: 'Счётчик, фильтр, обратный клапан, демпфер, сервоприводы. Подготовка под умный дом.',
    badge: 'Учёт + умный дом',
    price: '9 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v02-clean',
    title: 'V02 | Узел без счетчика',
    category: 'no-meter',
    desc: 'Компактная врезка без учета. Запорная арматура, фильтр, антивибрационные компенсаторы.',
    badge: 'Компакт',
    price: '10 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v03-cold',
    title: 'V03 | Узел ХВС',
    category: 'cold-only',
    desc: 'Только холодное водоснабжение. Защита от гидроудара, фильтр тонкой очистки.',
    badge: 'ХВС',
    price: '15 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v04-dual',
    title: 'V04 | Узел ГВС + ХВС',
    category: 'dual-circuit',
    desc: 'Два контура, балансировка, обратные клапаны, фильтрация. Готов к теплообменнику.',
    badge: 'Два контура',
    price: '12 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v05-smart',
    title: 'V05 | Узел с подготовкой под умный дом',
    category: 'smart-ready',
    desc: 'Места под датчики протечки, сервоприводы, кабель-каналы. Сборка на клипсах.',
    badge: 'Smart ready',
    price: '17 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v06-premium',
    title: 'V06 | Премиальная отделка',
    category: 'premium-finish',
    desc: 'Закрытый фасад, скрытые крепления, порошковая окраска. Минимум визуального шума.',
    badge: 'Premium',
    price: '19 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v07-compact',
    title: 'V07 | Компактный узел',
    category: 'no-meter',
    desc: 'Минимальные габариты. Узел без учета для ограниченного пространства монтажа.',
    badge: 'Compact',
    price: '8 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v08-service',
    title: 'V08 | Узел с сервисными кранами',
    category: 'with-meter',
    desc: 'Удобное обслуживание: сервисные точки, разборная геометрия, быстрый доступ к фильтру.',
    badge: 'Service',
    price: '14 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v09-antiwater',
    title: 'V09 | Антигидроудар',
    category: 'cold-only',
    desc: 'Защита от гидроудара и вибраций. Стабильная работа при скачках давления.',
    badge: 'Anti-shock',
    price: '13 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v10-dual-pro',
    title: 'V10 | Два контура PRO',
    category: 'dual-circuit',
    desc: 'Два контура, балансировка, дополнительные узлы безопасности и фильтрации.',
    badge: 'PRO',
    price: '21 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v11-smart-plus',
    title: 'V11 | Smart ready +',
    category: 'smart-ready',
    desc: 'Подготовка под датчики протечки и сервоприводы + улучшенная трассировка кабелей.',
    badge: 'Smart+',
    price: '23 т.р.',
    tag: 'Новинка',
  },
  {
    slug: 'v12-premium-black',
    title: 'V12 | Premium Black',
    category: 'premium-finish',
    desc: 'Закрытые панели, монохромная геометрия, акцент на графит/серебро.',
    badge: 'Black',
    price: '25 т.р.',
    tag: 'Новинка',
  },
]

export default function UzelCatalogPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const { addItem, openCart } = useCartStore()

  const selectedCategory =
    uzelCategories.find((c) => c.slug === categorySlug)?.slug || uzelCategories[0]?.slug
  const selectedCategoryTitle = useMemo(
    () => uzelCategories.find((c) => c.slug === selectedCategory)?.title || 'Категория',
    [selectedCategory],
  )

  const filteredProducts = useMemo(() => {
    return placeholderProducts.filter((p) => {
      const matchCategory = !selectedCategory || p.category === selectedCategory
      return matchCategory
    })
  }, [selectedCategory])

  const addBySlug = (slug: string) => {
    const p = getFallbackProductBySlug(slug)
    if (!p) return
    addItem(p, 1)
    openCart()
  }

  return (
    <motion.div
      className={styles.catalogPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.borkContainer}>
        <header className={styles.borkHero} aria-label="Каталог узлов ввода">
          <h1 className={styles.borkTitle}>{selectedCategoryTitle}</h1>
          <p className={styles.borkSubtitle}>УЗЕЛ ВВОДА</p>
        </header>

        <div className={styles.borkLayout}>
          <aside className={styles.borkSidebar} aria-label="Категории">
            <ul className={styles.borkCategoryList}>
              {uzelCategories.map((cat) => {
                const isActive = cat.slug === selectedCategory
                return (
                  <li key={cat.slug}>
                    <Link
                      to={`/catalog/uzel-vvoda/${cat.slug}`}
                      className={`${styles.borkCategoryLink} ${isActive ? styles.borkCategoryLinkActive : ''}`}
                    >
                      {cat.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section className={styles.borkSection} aria-label="Список комплектов">
            <div className={styles.borkSectionTop}>
              <p className={styles.borkSectionLead}>Комплектации и варианты исполнения.</p>
              <Link to="/shop" className={styles.borkShopLink}>
                ПЕРЕЙТИ В МАГАЗИН
              </Link>
            </div>

            <div className={styles.borkGrid}>
              {filteredProducts.map((product, index) => (
                <motion.article
                  key={product.slug}
                  className={styles.borkCard}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.03, duration: 0.35, ease: [0.23, 0.9, 0.15, 1] }}
                >
                  <Link to={`/shop/product/${product.slug}`} className={styles.borkCardLink} aria-label={product.title}>
                    <div className={styles.borkTile}>
                      <div className={styles.borkTileMark} aria-hidden="true">
                        VAVIP
                      </div>
                      <div className={styles.borkCardMedia} aria-hidden="true">
                        <svg className={styles.nodeSvg} viewBox="0 0 120 120" role="presentation">
                          <path d="M25 60h70" />
                          <path d="M60 25v70" />
                          <path d="M38 48h44" />
                          <path d="M38 72h44" />
                          <circle cx="60" cy="60" r="10" />
                          <circle cx="25" cy="60" r="6" />
                          <circle cx="95" cy="60" r="6" />
                          <circle cx="60" cy="25" r="6" />
                          <circle cx="60" cy="95" r="6" />
                        </svg>
                      </div>
                    </div>

                    <div className={styles.borkInfo}>
                      <h3 className={styles.borkName}>{product.title}</h3>
                      <div className={styles.borkPriceRow}>
                        <span className={styles.borkPrice}>{product.price}</span>
                        <span className={styles.borkTag}>{product.tag}</span>
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    className={styles.borkPlus}
                    aria-label="Добавить в корзину"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      addBySlug(product.slug)
                    }}
                  >
                    +
                  </button>
                </motion.article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

