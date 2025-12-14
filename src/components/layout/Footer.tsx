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
      <div className={styles.inner}>
        <div className={styles.footerContent}>
          <div className={styles.columns} aria-label="Ссылки">
            <div className={styles.column}>
              <strong>КОНФИДЕНЦИАЛЬНОСТЬ И УСЛОВИЯ</strong>
              <Link to="/privacy">ПОЛИТИКА ОБРАБОТКИ И ЗАЩИТЫ ПЕРСОНАЛЬНЫХ ДАННЫХ И ИСПОЛЬЗОВАНИЯ COOKIE</Link>
              <Link to="/terms">ДОГОВОР ОФЕРТЫ BIM</Link>
              <Link to="/warranty">ГАРАНТИЯ</Link>
              <Link to="/design-contract">ДОГОВОР НА ПРОЕКТИРОВАНИЕ BIM/ПРОЕКТИРОВАНИЕ ИНЖЕНЕРНЫХ СИСТЕМ</Link>
            </div>
            <div className={styles.column}>
              <strong>СОТРУДНИЧЕСТВО</strong>
              <Link to="/for-designers">ДИЗАЙНЕРАМ И АРХИТЕКТОРАМ</Link>
              <Link to="/for-builders">РУКОВОДИТЕЛЯМ СТРОИТЕЛЬНЫХ КОМПАНИЙ И ПРОЕКТИРОВАНИЮ BIM/ОВ</Link>
              <Link to="/for-distributors">ДИСТРИБЬЮТОРАМ</Link>
              <Link to="/for-visual">ДЛЯ ВИЗУАЛА</Link>
            </div>
          </div>

          <div className={styles.footerDivider} aria-hidden="true" />

          <div className={styles.footerBottomWrapper}>
            <div className={styles.footerBottom}>
              <div className={styles.verticalTextFooter}>
                <img src="/images/vavip_logo_text.png" alt="Vavip" />
              </div>
              <div className={styles.socialIcons} aria-label="Социальные сети">
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
            <div className={styles.copyrightText}>© 2024 VAVIP. All Rights Reserved</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
