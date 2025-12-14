import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

const socialLinks = [
  { name: 'telegram', url: 'https://t.me/karen_vavip' },
  { name: 'instagram', url: 'https://instagram.com/karen_vavip' },
  { name: 'vk', url: 'https://vk.com/karen_vavip' },
  { name: 'pinterest', url: 'https://pinterest.com/karen_vavip' },
  { name: 'youtube', url: 'https://youtube.com/@karenvavip' },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.borderTop} />
      <div className={styles.inner}>
        <div className={styles.top}>
          <nav className={styles.navGrid} aria-label="Ссылки">
            <ul className={styles.navList}>
              <li className={styles.navTitle}>КОНФИДЕНЦИАЛЬНОСТЬ</li>
              <li><Link to="/privacy">ПОЛИТИКА</Link></li>
              <li><Link to="/terms">ОФЕРТА BIM</Link></li>
              <li><Link to="/warranty">ГАРАНТИЯ</Link></li>
              <li><Link to="/design-contract">ДОГОВОР НА ПРОЕКТИРОВАНИЕ</Link></li>
            </ul>
            <ul className={styles.navList}>
              <li className={styles.navTitle}>СОТРУДНИЧЕСТВО</li>
              <li><Link to="/for-designers">ДИЗАЙНЕРАМ</Link></li>
              <li><Link to="/for-builders">СТРОИТЕЛЯМ</Link></li>
              <li><Link to="/for-distributors">ДИСТРИБЬЮТОРАМ</Link></li>
              <li><Link to="/for-visual">ДЛЯ ВИЗУАЛА</Link></li>
            </ul>
            <ul className={styles.navList}>
              <li className={styles.navTitle}>КОНТАКТЫ</li>
              <li><Link to="/contacts">СТРАНИЦА КОНТАКТОВ</Link></li>
              <li><a href="tel:+79312487013">+7 931 248 70 13</a></li>
            </ul>
          </nav>

          <div className={styles.right}>
            <div className={styles.brand}>
              <img src="/images/vavip_logo_text.png" alt="Vavip" />
            </div>
            <div className={styles.social} aria-label="Социальные сети">
              {socialLinks.map(({ name, url }) => (
                <a
                  key={name}
                  href={url}
                  className={styles.socialIcon}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                >
                  <img src={`/images/icons/${name}.svg`} alt="" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copy}>© 2024 VAVIP</span>
          <span className={styles.copyMuted}>ALL RIGHTS RESERVED</span>
        </div>
      </div>
    </footer>
  )
}
