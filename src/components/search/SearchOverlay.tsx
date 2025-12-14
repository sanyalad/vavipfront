import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useUIStore } from '@/store/uiStore'
import styles from './SearchOverlay.module.css'

const quickTerms = ['чайник', 'термокружка', 'массажер', 'утюг']

const quickCategories = [
  { label: 'Идеи подарков', href: '/shop?category=gift' },
  { label: 'Кухня', href: '/shop?category=kitchen' },
  { label: 'Красота и здоровье', href: '/shop?category=beauty' },
  { label: 'Новинки', href: '/shop?category=new' },
]

const demoCards = [
  { title: 'Узел ввода V01', price: '9 т.р.', href: '/shop/product/v01-meter', tag: 'Новинка' },
  { title: 'Узел ввода V02', price: '10 т.р.', href: '/shop/product/v02-clean', tag: 'Новинка' },
  { title: 'Узел ввода V03', price: '15 т.р.', href: '/shop/product/v03-cold', tag: 'Новинка' },
  { title: 'Узел ввода V04', price: '12 т.р.', href: '/shop/product/v04-dual', tag: 'Новинка' },
]

export default function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useUIStore()
  const [query, setQuery] = useState('')

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return demoCards
    return demoCards.filter((c) => c.title.toLowerCase().includes(q))
  }, [query])

  // Lock scroll (and also signal Home custom-scroll to back off)
  useEffect(() => {
    if (!isSearchOpen) return
    document.body.classList.add('dropdown-scroll-lock')
    return () => {
      document.body.classList.remove('dropdown-scroll-lock')
    }
  }, [isSearchOpen])

  // ESC to close
  useEffect(() => {
    if (!isSearchOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSearchOpen, closeSearch])

  if (!portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {isSearchOpen && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          />

          <motion.section
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Поиск по каталогу"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.23, 0.9, 0.15, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.top}>
              <div className={styles.searchRow}>
                <input
                  autoFocus
                  className={styles.input}
                  placeholder="Поиск по каталогу"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className={styles.actionBtn} type="button" onClick={() => void 0}>
                  НАЙТИ
                </button>
              </div>
            </div>

            <div className={styles.body}>
              <aside className={styles.left}>
                <div className={styles.block}>
                  <div className={styles.blockTitle}>ЧАСТО ИЩУТ</div>
                  <ul className={styles.list}>
                    {quickTerms.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          className={styles.term}
                          onClick={() => setQuery(t)}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.divider} />

                <div className={styles.block}>
                  <div className={styles.blockTitle}>КАТЕГОРИИ</div>
                  <ul className={styles.list}>
                    {quickCategories.map((c) => (
                      <li key={c.label}>
                        <Link to={c.href} className={styles.cat} onClick={closeSearch}>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div className={styles.right} aria-label="Результаты">
                <div className={styles.grid}>
                  {filteredCards.map((p) => (
                    <Link key={p.href} to={p.href} className={styles.card} onClick={closeSearch}>
                      <div className={styles.cardMedia}>
                        <div className={styles.cardPlus} aria-hidden="true">+</div>
                        <div className={styles.cardTag}>{p.tag}</div>
                        <div className={styles.cardImg} aria-hidden="true" />
                      </div>
                      <div className={styles.cardTitle}>{p.title}</div>
                      <div className={styles.cardPrice}>{p.price}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    portalTarget,
  )
}


