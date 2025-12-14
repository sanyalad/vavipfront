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
          <div className={styles.brandRow} aria-label="VAVIP">
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
