import styles from './MessengerLinks.module.css'

const messengerLinks = [
  { name: 'telegram', url: 'https://t.me/karen_vavip', label: 'Telegram' },
  { name: 'instagram', url: 'https://instagram.com/karen_vavip', label: 'Instagram' },
  { name: 'vk', url: 'https://vk.com/karen_vavip', label: 'VKontakte' },
]

export function MessengerLinks() {
  return (
    <div className={styles.container}>
      {messengerLinks.map(({ name, url, label }) => (
        <a
          key={name}
          href={url}
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
        >
          <img src={`/images/icons/${name}.svg`} alt={label} />
        </a>
      ))}
    </div>
  )
}

