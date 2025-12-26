import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import Profile from './Profile'
import Orders from './Orders'
import styles from './Account.module.css'

export default function AccountPage() {
  const { user, logout } = useAuth()

  return (
    <motion.div
      className={styles.account}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.first_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div>
              <p className={styles.userName}>
                {user?.first_name} {user?.last_name}
              </p>
              <p className={styles.userEmail}>{user?.email}</p>
            </div>
          </div>

          <nav className={styles.nav}>
            <NavLink 
              to="/account" 
              end
              className={({ isActive }) => isActive ? styles.active : ''}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Профиль
            </NavLink>
            <NavLink 
              to="/account/orders"
              className={({ isActive }) => isActive ? styles.active : ''}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Мои заказы
            </NavLink>
            <button onClick={logout} className={styles.logoutButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Выйти
            </button>
          </nav>
        </aside>

        <main className={styles.main}>
          <Routes>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="*" element={<Navigate to="/account" replace />} />
          </Routes>
        </main>
      </div>
    </motion.div>
  )
}












