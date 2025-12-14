import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Contacts.module.css'

type Department = 'montazh' | 'uzel' | 'bim' | 'shop'
type Country = 'uae' | 'georgia' | 'russia' | 'belarus' | 'kazakhstan'

const departments: { id: Department; label: string }[] = [
  { id: 'montazh', label: 'Монтаж' },
  { id: 'uzel', label: 'Узел ввода' },
  { id: 'bim', label: 'Проектирование' },
  { id: 'shop', label: 'Магазин' },
]

const countries: { id: Country; label: string }[] = [
  { id: 'uae', label: 'ОАЭ' },
  { id: 'georgia', label: 'Грузия' },
  { id: 'russia', label: 'Россия' },
  { id: 'belarus', label: 'Беларусь' },
  { id: 'kazakhstan', label: 'Казахстан' },
]

const citiesByCountry: Record<Country, string[]> = {
  uae: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  georgia: ['Tbilisi', 'Batumi', 'Kutaisi'],
  russia: ['Москва', 'Санкт-Петербург', 'Краснодар', 'Ростов-на-Дону', 'Самара', 'Воронеж'],
  belarus: ['Минск', 'Гомель', 'Брест'],
  kazakhstan: ['Астана', 'Алматы', 'Актобе'],
}

const phoneMap: Record<Country, Record<Department, string>> = {
  russia: { montazh: '+7 1111111', uzel: '+7 1222222', bim: '+7 1333333', shop: '+7 1444444' },
  kazakhstan: { montazh: '+7 2111111', uzel: '+7 2222222', bim: '+7 2333333', shop: '+7 2444444' },
  belarus: { montazh: '+375 3111111', uzel: '+375 3222222', bim: '+375 3333333', shop: '+375 3444444' },
  georgia: { montazh: '+995 4111111', uzel: '+995 4222222', bim: '+995 4333333', shop: '+995 4444444' },
  uae: { montazh: '+971 5111111', uzel: '+971 5222222', bim: '+971 5333333', shop: '+971 5444444' },
}

export default function ContactsPage() {
  const [showFeedback, setShowFeedback] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const [department, setDepartment] = useState<Department>('uzel')
  const [country, setCountry] = useState<Country>('russia')
  const [city, setCity] = useState<string>('Москва')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (feedbackRef.current && !feedbackRef.current.contains(e.target as Node)) {
        setShowFeedback(false)
      }
    }
    if (showFeedback) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFeedback])

  // When country changes, set a sensible default city.
  // IMPORTANT: do NOT validate/reset city on every keystroke, иначе невозможно вводить/редактировать.
  useEffect(() => {
    const cities = citiesByCountry[country]
    setCity(cities[0] || '')
  }, [country])

  const selectedPhone = phoneMap[country]?.[department] ?? '+7 0000000'

  return (
    <motion.div
      className={styles.contactsPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section className={styles.pageIntro}>
        <div className={styles.pageIntroInner}>
          <h1 className={styles.pageTitle}>Контакты</h1>
          <p className={styles.pageLead}>
            Свяжитесь с нами или выберите ближайший офис. Работаем премиально: быстро, прозрачно, в едином стиле.
          </p>
        </div>
      </section>

      <section className={styles.cardsGrid}>
        <div className={`${styles.card} ${styles.cardFeedback}`}>
          <div className={styles.cardOverlay} />
          <div className={styles.cardContent}>
            <p className={styles.cardKicker}>Связаться</p>
            <h2 className={styles.cardTitle}>{selectedPhone}</h2>
            <p className={styles.cardSubtitle}>Каждый день с 8:00 до 22:00</p>

            <div className={styles.phoneSelectors} aria-label="Параметры связи">
              <label className={styles.selectorField}>
                <span className={styles.selectorLabel}>Отдел</span>
                <select
                  className={styles.selectorControl}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.selectorField}>
                <span className={styles.selectorLabel}>Страна</span>
                <select
                  className={styles.selectorControl}
                  value={country}
                  onChange={(e) => setCountry(e.target.value as Country)}
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.selectorField}>
                <span className={styles.selectorLabel}>Город</span>
                <input
                  className={styles.selectorControl}
                  list={`cities-${country}`}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Начните вводить…"
                />
                <datalist id={`cities-${country}`}>
                  {citiesByCountry[country].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className={styles.cardActions}>
              <button className={styles.cardButton} onClick={() => setShowFeedback(true)}>Обратная связь</button>
              <div className={styles.socialRow}>
                <a href="https://www.youtube.com" aria-label="YouTube" className={styles.socialIcon}>▶</a>
                <a href="https://vk.com" aria-label="VK" className={styles.socialIcon}>VK</a>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardOffices}`}>
          <div className={styles.cardOverlay} />
          <div className={styles.cardContent}>
            <p className={styles.cardKicker}>Бутики / Офисы</p>
            <h2 className={styles.cardTitle}>Познакомьтесь с коллекцией</h2>
            <p className={styles.cardSubtitle}>
              Узлы ввода, проектирование и монтаж. Запишитесь, чтобы увидеть решения вживую.
            </p>
            <div className={styles.cardActions}>
              <a className={styles.cardButtonSecondary} href="#map">Выбрать офис</a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mapSection} id="map">
        <div className={styles.mapHeader}>
          <div>
            <p className={styles.cardKicker}>Карта</p>
            <h3 className={styles.mapTitle}>Найдите ближайший офис</h3>
            <p className={styles.cardSubtitle}>Определите местоположение и выберите удобный бутик или пункт выдачи.</p>
          </div>
          <button className={styles.mapButton}>Определить автоматически</button>
        </div>
        <div className={styles.mapPlaceholder}>
          <span>Здесь будет интерактивная карта с выбором ближайшего офиса</span>
        </div>
      </section>

      <AnimatePresence>
        {showFeedback && (
          <motion.div
            className={styles.feedbackPanel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div ref={feedbackRef} className={styles.feedbackForm}>
              <button
                type="button"
                className={styles.formClose}
                onClick={() => setShowFeedback(false)}
                aria-label="Закрыть форму"
              >
                ×
              </button>
              <div className={styles.formInner}>
                <label htmlFor="topic">Тема</label>
                <label htmlFor="email">Email</label>
                
                <select id="topic" name="topic" required>
                  <option value="quality_products">Качество продуктов, услуг и доставки</option>
                  <option value="support">Техническая поддержка</option>
                  <option value="other">Другое</option>
                </select>
                <input id="email" name="email" type="email" required />
                
                <label htmlFor="name">Имя <span className={styles.required}>*</span></label>
                <label htmlFor="phone">Телефон <span className={styles.required}>*</span></label>
                
                <input id="name" name="name" type="text" required />
                <input id="phone" name="phone" type="tel" required placeholder="+7 (___) ___-__-__" />
                
                <label htmlFor="message" className={styles.fullWidth}>Комментарий</label>
                <textarea id="message" name="message" required rows={2} className={styles.fullWidth} />
                
                <div className={styles.submitWrapper}>
                  <button type="submit" className={styles.submitBtn}>
                    ОТПРАВИТЬ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
