import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './UzelPreview.module.css'
import { uzelCategories } from '@/data/uzelCatalog'

export default function UzelPreview() {
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
      { threshold: 0.3, rootMargin: '0px' }
    )

    cards.forEach((card) => {
      observer.observe(card)
    })

    return () => {
      cards.forEach((card) => observer.unobserve(card))
    }
  }, [])

  return (
    <section className={styles.previewSection} aria-labelledby="uzel-preview-title">
      <div className={styles.header}>
        <p className={styles.kicker}>Каталог / Узлы ввода</p>
        <h2 id="uzel-preview-title" className={styles.title}>
          Быстрый просмотр категорий
        </h2>
        <p className={styles.lead}>
          Подбор готовых конфигураций: учёт, фильтрация, подготовка под умный дом и премиальная отделка.
        </p>
        <div className={styles.actions}>
          <Link to="/catalog/uzel-vvoda" className={styles.primaryCta}>
            Открыть каталог
          </Link>
          <Link to="/contacts" className={styles.secondaryCta}>
            Нужна консультация
          </Link>
        </div>
      </div>

      <div ref={gridRef} className={styles.grid}>
        {uzelCategories.slice(0, 4).map((item, index) => (
          <article
            key={item.slug}
            className={styles.card}
            style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
          >
            <div className={styles.cardTop}>
              <span className={styles.badge}>PREVIEW</span>
              <span className={styles.code}>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardText}>{item.description}</p>
            <Link to={`/catalog/uzel-vvoda/${item.slug}`} className={styles.cardLink}>
              Подробнее
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

