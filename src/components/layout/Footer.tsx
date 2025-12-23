import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Footer.module.css'

const socialLinks = [
  { name: 'telegram', url: 'https://t.me/karen_vavip' },
  { name: 'instagram', url: 'https://instagram.com/karen_vavip' },
  { name: 'vk', url: 'https://vk.com/karen_vavip' },
  { name: 'pinterest', url: 'https://pinterest.com/karen_vavip' },
  { name: 'youtube', url: 'https://youtube.com/@karenvavip' },
]

// Stagger animation for columns
const columnVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const linkVariants = {
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
}

const socialVariants = {
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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <motion.div 
        className={styles.inner}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className={styles.footerContent}>
          <div className={styles.columns} aria-label="Ссылки">
            <motion.div className={styles.column} variants={columnVariants}>
              <motion.strong variants={linkVariants}>КОНФИДЕНЦИАЛЬНОСТЬ И УСЛОВИЯ</motion.strong>
              <motion.div variants={linkVariants}>
                <Link to="/privacy">ПОЛИТИКА ОБРАБОТКИ И ЗАЩИТЫ ПЕРСОНАЛЬНЫХ ДАННЫХ И ИСПОЛЬЗОВАНИЯ COOKIE</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
                <Link to="/terms">ДОГОВОР ОФЕРТЫ BIM</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
                <Link to="/warranty">ГАРАНТИЯ</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
                <Link to="/design-contract">ДОГОВОР НА ПРОЕКТИРОВАНИЕ BIM/ПРОЕКТИРОВАНИЕ ИНЖЕНЕРНЫХ СИСТЕМ</Link>
              </motion.div>
            </motion.div>
            <motion.div className={styles.column} variants={columnVariants}>
              <motion.strong variants={linkVariants}>СОТРУДНИЧЕСТВО</motion.strong>
              <motion.div variants={linkVariants}>
                <Link to="/for-designers">ДИЗАЙНЕРАМ И АРХИТЕКТОРАМ</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
                <Link to="/for-builders">РУКОВОДИТЕЛЯМ СТРОИТЕЛЬНЫХ КОМПАНИЙ И ПРОЕКТИРОВАНИЮ BIM/ОВ</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
                <Link to="/for-distributors">ДИСТРИБЬЮТОРАМ</Link>
              </motion.div>
              <motion.div variants={linkVariants}>
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
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {socialLinks.map(({ name, url }, index) => (
                  <motion.a
                    key={name}
                    href={url}
                    className={styles.socialIcon}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    variants={socialVariants}
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
        </div>
      </motion.div>
    </footer>
  )
}
