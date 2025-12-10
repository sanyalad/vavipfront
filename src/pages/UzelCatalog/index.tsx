import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import styles from './UzelCatalog.module.css'
import { uzelCategories } from '@/data/uzelCatalog'

const placeholderProducts = [
  {
    slug: 'v01-meter',
    title: 'V01 | Узел с счетчиком',
    category: 'with-meter',
    desc: 'Счётчик, фильтр, обратный клапан, демпфер, сервоприводы. Подготовка под умный дом.',
    badge: 'Учёт + умный дом',
  },
  {
    slug: 'v02-clean',
    title: 'V02 | Узел без счетчика',
    category: 'no-meter',
    desc: 'Компактная врезка без учета. Запорная арматура, фильтр, антивибрационные компенсаторы.',
    badge: 'Компакт',
  },
  {
    slug: 'v03-cold',
    title: 'V03 | Узел ХВС',
    category: 'cold-only',
    desc: 'Только холодное водоснабжение. Защита от гидроудара, фильтр тонкой очистки.',
    badge: 'ХВС',
  },
  {
    slug: 'v04-dual',
    title: 'V04 | Узел ГВС + ХВС',
    category: 'dual-circuit',
    desc: 'Два контура, балансировка, обратные клапаны, фильтрация. Готов к теплообменнику.',
    badge: 'Два контура',
  },
  {
    slug: 'v05-smart',
    title: 'V05 | Узел с подготовкой под умный дом',
    category: 'smart-ready',
    desc: 'Места под датчики протечки, сервоприводы, кабель-каналы. Сборка на клипсах.',
    badge: 'Smart ready',
  },
  {
    slug: 'v06-premium',
    title: 'V06 | Премиальная отделка',
    category: 'premium-finish',
    desc: 'Закрытый фасад, скрытые крепления, порошковая окраска. Минимум визуального шума.',
    badge: 'Premium',
  },
]

export default function UzelCatalogPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const selectedCategory =
    uzelCategories.find((c) => c.slug === categorySlug)?.slug || uzelCategories[0]?.slug

  const filteredProducts = placeholderProducts.filter(
    (p) => !selectedCategory || p.category === selectedCategory,
  )

  return (
    <motion.div
      className={styles.catalogPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>VAVIP | УЗЛЫ ВВОДА</p>
          <h1 className={styles.title}>Каталог узлов ввода</h1>
          <p className={styles.lead}>
            Подбор модулей под учёт, фильтрацию и подготовку к умному дому. Поддержка ХВС/ГВС, варианты с
            премиальной отделкой и скрытыми креплениями.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href="#uzel-grid">
              К категориям
            </a>
            <Link className={styles.secondaryCta} to="/contacts">
              Консультация инженера
            </Link>
          </div>
        </div>
        <div className={styles.heroPreview} aria-hidden="true">
          <div className={styles.previewCard}>
            <div className={styles.previewBadge}>BORK STYLE</div>
            <div className={styles.previewBody}>
              <p>Сборка</p>
              <strong>Комплект V01</strong>
              <span>Счётчик, фильтр, обратный клапан, демпфер, сервоприводы</span>
            </div>
          </div>
        </div>
      </div>

      <section id="uzel-grid" className={styles.catalogLayout}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Категории</h3>
          <ul className={styles.categoryList}>
            {uzelCategories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  to={`/catalog/uzel-vvoda/${cat.slug}`}
                  className={`${styles.categoryItem} ${
                    selectedCategory === cat.slug ? styles.categoryItemActive : ''
                  }`}
                >
                  <span className={styles.categoryDot} />
                  <span className={styles.categoryName}>{cat.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.productsArea}>
          <header className={styles.productsHeader}>
            <div>
              <p className={styles.kicker}>Товары</p>
              <h2 className={styles.sectionTitle}>
                {uzelCategories.find((c) => c.slug === selectedCategory)?.title || 'Категория'}
              </h2>
              <p className={styles.sectionLead}>
                Макеты и заглушки. Нажмите «3D-заглушка» или «Подробнее» — откроется заглушка карточки.
              </p>
            </div>
            <Link to="/shop" className={styles.secondaryCta}>
              Перейти в магазин
            </Link>
          </header>

          <div className={styles.productsGrid}>
            {filteredProducts.map((product, index) => (
              <motion.article
                key={product.slug}
                className={styles.productCard}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.04, duration: 0.4, ease: [0.25, 0.85, 0.25, 1] }}
              >
                <div className={styles.productTop}>
                  <span className={styles.productBadge}>{product.badge}</span>
                  <span className={styles.productCode}>{product.slug.toUpperCase()}</span>
                </div>
                <h3 className={styles.productTitle}>{product.title}</h3>
                <p className={styles.productText}>{product.desc}</p>
                <div className={styles.productActions}>
                  <button type="button" className={styles.ghostBtn}>
                    3D-заглушка
                  </button>
                  <button type="button" className={styles.primaryGhostBtn}>
                    Подробнее
                  </button>
                </div>
                <div className={styles.productPlaceholder} aria-hidden="true">
                  <div className={styles.placeholderShape} />
                  <div className={styles.placeholderOverlay}>3D preview soon</div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  )
}

