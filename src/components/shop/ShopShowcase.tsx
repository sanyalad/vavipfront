import { forwardRef, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './ShopShowcase.module.css'

const placeholderItems = [
  {
    title: 'Узел ввода',
    subtitle: 'BORK | V01',
    description: 'Компактный блок для ввода воды с фильтрацией и автоматикой. Дизайн-панель со скрытыми креплениями.',
    status: 'Скоро',
    badge: 'Новый макет',
  },
  {
    title: 'Коллекторный шкаф',
    subtitle: 'BORK | M02',
    description: 'Готовый к монтажу комплект для квартир и коттеджей. Минималистичный фасад, аккуратные клеммы.',
    status: 'Заглушка',
    badge: '2 контура',
  },
  {
    title: 'Насосный модуль',
    subtitle: 'BORK | C03',
    description: 'Подающий блок с виброизоляцией и тихими насосами. Подготовлен для гликоля и смесительных узлов.',
    status: 'Скоро',
    badge: 'Тихий режим',
  },
  {
    title: 'Гидрострелка',
    subtitle: 'BORK | H04',
    description: 'Балансировка гидравлики для каскадных котлов. Декоративный кожух, контроль температуры.',
    status: 'Заглушка',
    badge: 'DN40',
  },
  {
    title: 'Контур тёплого пола',
    subtitle: 'BORK | F05',
    description: 'Шкаф с распределением по зонам, сервоприводы и контроллер. Готовность под умный дом.',
    status: 'Скоро',
    badge: '6 зон',
  },
  {
    title: 'Бойлерный узел',
    subtitle: 'BORK | W06',
    description: 'Горячее водоснабжение с рециркуляцией. Коллектор из нержавейки и сервисные краны.',
    status: 'Заглушка',
    badge: 'Нерж.',
  },
]

const ShopShowcase = forwardRef<HTMLElement, { className?: string }>(function ShopShowcase({ className }, ref) {
  const sectionClass = [styles.catalog, className].filter(Boolean).join(' ')
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const cards = grid.querySelectorAll<HTMLElement>(`.${styles.card}`)
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.cardVisible)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.35, rootMargin: '0px' }
    )

    cards.forEach((card) => {
      observer.observe(card)
    })

    return () => {
      cards.forEach((card) => observer.unobserve(card))
    }
  }, [])

  return (
    <section ref={ref} className={sectionClass} id="home-shop-catalog" aria-labelledby="shop-showcase-title">
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.kicker}>SAN TECH</p>
          <h2 id="shop-showcase-title" className={styles.title}>
            Каталог инженерных узлов
          </h2>
          <p className={styles.lead}>
            Макеты узлов и готовых решений для квартир и коттеджей. Пока заглушки — визуализируем компоновку,
            компоновку и оформление.
          </p>
          <div className={styles.actions}>
            <Link to="/shop" className={styles.primaryCta}>
              Перейти в магазин
            </Link>
            <button type="button" className={styles.secondaryCta} aria-label="Каталог скоро будет доступен">
              Каталог PDF — скоро
            </button>
          </div>
        </div>

        <div ref={gridRef} className={styles.grid}>
          {placeholderItems.map((item, index) => (
            <article
              key={item.title}
              className={styles.card}
              style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
            >
              <div className={styles.cardTop}>
                <span className={styles.badge}>{item.badge}</span>
                <span className={styles.code}>{item.subtitle}</span>
              </div>
              <div className={styles.thumb} aria-hidden="true">
                <div className={styles.thumbGlow} />
                <div className={styles.thumbShape} />
                <div className={styles.thumbOverlay} />
                <span className={styles.status}>{item.status}</span>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.description}</p>
                <div className={styles.chips}>
                  <span className={styles.chip}>Сантехнический узел</span>
                  <span className={styles.chip}>Премиум отделка</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
})

export default ShopShowcase

