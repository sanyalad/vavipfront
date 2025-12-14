import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import styles from './NotFound.module.css'

export default function NotFoundPage() {
  return (
    <motion.div
      className={styles.notFound}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Страница не найдена</h2>
        <p className={styles.text}>
          К сожалению, запрашиваемая страница не существует или была удалена.
        </p>
        <Link to="/">
          <Button>Вернуться на главную</Button>
        </Link>
      </div>
    </motion.div>
  )
}






