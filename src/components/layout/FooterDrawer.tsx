import { forwardRef, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './FooterDrawer.module.css'

const socialLinks = [
  { name: 'telegram', url: 'https://t.me/karen_vavip' },
  { name: 'instagram', url: 'https://instagram.com/karen_vavip' },
  { name: 'vk', url: 'https://vk.com/karen_vavip' },
  { name: 'pinterest', url: 'https://pinterest.com/karen_vavip' },
  { name: 'youtube', url: 'https://youtube.com/@karenvavip' },
]

interface FooterDrawerProps {
  onClose: () => void
  isOpen: boolean
}

const FooterDrawer = forwardRef<HTMLDivElement, FooterDrawerProps>(
  ({ onClose, isOpen }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Reset scroll position when footer opens
    useEffect(() => {
      if (isOpen && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }, [isOpen])

    // Handle internal scroll - prevent propagation when scrolling inside footer
    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const handleWheel = (e: WheelEvent) => {
        const { scrollTop, scrollHeight, clientHeight } = container
        const atTop = scrollTop === 0
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1

        // Allow scroll inside footer
        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
          // At boundaries - let parent handle (close footer on scroll up at top)
          if (e.deltaY < 0 && atTop) {
            onClose()
          }
        } else {
          // Scrolling inside - stop propagation
          e.stopPropagation()
        }
      }

      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }, [onClose])

    return (
      <>
        {/* Backdrop */}
        <div
          ref={ref}
          data-footer-backdrop
          className={styles.backdrop}
          onClick={onClose}
        />

        {/* Footer Content */}
        <footer data-footer className={styles.footer}>
          {/* Scroll container */}
          <div ref={scrollContainerRef} className={styles.scrollContainer}>
            {/* Header with close button */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <h2 className={styles.headerTitle}>Контакты и информация</h2>
                <button
                  onClick={onClose}
                  className={styles.closeButton}
                  aria-label="Закрыть футер"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 5L5 10L10 15L15 10L10 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.content}>
              <motion.div
                className={styles.footerContent}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.2,
                    },
                  },
                }}
              >
                <div className={styles.columns} aria-label="Ссылки">
                  <motion.div
                    className={styles.column}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                        },
                      },
                    }}
                  >
                    <motion.strong
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                      }}
                    >
                      КОНФИДЕНЦИАЛЬНОСТЬ И УСЛОВИЯ
                    </motion.strong>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/privacy">
                        ПОЛИТИКА ОБРАБОТКИ И ЗАЩИТЫ ПЕРСОНАЛЬНЫХ ДАННЫХ И ИСПОЛЬЗОВАНИЯ COOKIE
                      </Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/terms">ДОГОВОР ОФЕРТЫ BIM</Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/warranty">ГАРАНТИЯ</Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/design-contract">
                        ДОГОВОР НА ПРОЕКТИРОВАНИЕ BIM/ПРОЕКТИРОВАНИЕ ИНЖЕНЕРНЫХ СИСТЕМ
                      </Link>
                    </motion.div>
                  </motion.div>
                  <motion.div
                    className={styles.column}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                        },
                      },
                    }}
                  >
                    <motion.strong
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 },
                      }}
                    >
                      СОТРУДНИЧЕСТВО
                    </motion.strong>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/for-designers">ДИЗАЙНЕРАМ И АРХИТЕКТОРАМ</Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/for-builders">
                        РУКОВОДИТЕЛЯМ СТРОИТЕЛЬНЫХ КОМПАНИЙ И ПРОЕКТИРОВАНИЮ BIM/ОВ
                      </Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/for-distributors">ДИСТРИБЬЮТОРАМ</Link>
                    </motion.div>
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          },
                        },
                      }}
                    >
                      <Link to="/for-visual">ДЛЯ ВИЗУАЛА</Link>
                    </motion.div>
                  </motion.div>
                </div>

                <motion.div
                  className={styles.footerDivider}
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  style={{ transformOrigin: 'left' }}
                />

                <motion.div
                  className={styles.footerBottomWrapper}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className={styles.footerBottom}>
                    <motion.div
                      className={styles.verticalTextFooter}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <img src="/images/vavip_logo_text.png" alt="Vavip" />
                    </motion.div>
                    <motion.div
                      className={styles.socialIcons}
                      aria-label="Социальные сети"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.1,
                            delayChildren: 0.2,
                          },
                        },
                      }}
                    >
                      {socialLinks.map(({ name, url }, index) => (
                        <motion.a
                          key={name}
                          href={url}
                          className={styles.socialIcon}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={name}
                          variants={{
                            hidden: { opacity: 0, scale: 0.8 },
                            visible: {
                              opacity: 1,
                              scale: 1,
                              transition: {
                                type: 'spring',
                                stiffness: 400,
                                damping: 20,
                              },
                            },
                          }}
                          whileHover={{
                            scale: 1.15,
                            y: -3,
                            boxShadow: '0 6px 20px rgba(255, 255, 255, 0.15)',
                          }}
                          whileTap={{ scale: 0.95 }}
                          custom={index}
                        >
                          <img src={`/images/icons/${name}.svg`} alt="" aria-hidden="true" />
                        </motion.a>
                      ))}
                    </motion.div>
                  </div>
                  <motion.div
                    className={styles.copyrightText}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    © 2024 VAVIP. All Rights Reserved
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </footer>
      </>
    )
  }
)

FooterDrawer.displayName = 'FooterDrawer'

export default FooterDrawer

