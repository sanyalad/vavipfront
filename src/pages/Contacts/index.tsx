import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Contacts.module.css'

export default function ContactsPage() {
  const [showFeedback, setShowFeedback] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

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
            <h2 className={styles.cardTitle}>8 800 500 88 99</h2>
            <p className={styles.cardSubtitle}>Каждый день с 8:00 до 22:00</p>
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
