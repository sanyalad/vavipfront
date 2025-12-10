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
    <div className={styles.footerContent}>
      <div className={styles.columns}>
        <div>
          <strong>КОНФИДЕНЦИАЛЬНОСТЬ И УСЛОВИЯ</strong>
          <Link to="/privacy">ПОЛИТИКА ОБРАБОТКИ И ЗАЩИТЫ ПЕРСОНАЛЬНЫХ ДАННЫХ И ИСПОЛЬЗОВАНИЯ COOKIE</Link>
          <Link to="/terms">ДОГОВОР ОФЕРТЫ БИМ</Link>
          <Link to="/warranty">ГАРАНТИЯ</Link>
          <Link to="/design-contract">ДОГОВОР НА ПРОЕКТИРОВАНИЕ ИНЖЕНЕРНЫХ СИСТЕМ</Link>
        </div>
        <div>
          <strong>СОТРУДНИЧЕСТВО</strong>
          <Link to="/for-designers">ДИЗАЙНЕРАМ И АРХИТЕКТОРАМ</Link>
          <Link to="/for-builders">РУКОВОДИТЕЛЯМ СТРОИТЕЛЬНЫХ КОМПАНИЙ И ПРОЕКТОВ</Link>
          <Link to="/for-distributors">ДИСТРИБЬЮТОРАМ</Link>
          <Link to="/for-visual">ДЛЯ ВИЗУАЛА</Link>
        </div>
      </div>

      <div className={styles.footerDivider} />

      <div className={styles.footerBottomWrapper}>
        <div className={styles.footerBottom}>
          <div className={styles.verticalTextFooter}>
            <img src="/images/vavip_logo_text.png" alt="Vavip" />
          </div>
          <div className={styles.socialIcons}>
            {socialLinks.map(({ name, url }) => (
              <a 
                key={name}
                href={url} 
                className={`${styles.socialIcon} ${styles[name]}`}
                target="_blank" 
                rel="noopener noreferrer"
                aria-label={name}
              >
                <img src={`/images/icons/${name}.svg`} alt={name} />
              </a>
            ))}
          </div>
        </div>
        <div className={styles.copyrightText}>© 2024 Vavip. All Rights Reserved</div>
      </div>
    </div>
  )
}
