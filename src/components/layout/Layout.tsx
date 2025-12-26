import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartSidebar from '../features/Cart/CartSidebar'
import AuthSidebar from '../auth/AuthSidebar'
import SearchOverlay from '../search/SearchOverlay'
import ToastContainer from '../ui/Toast/ToastContainer'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  
  // Home page has its own footer in the video sections wrapper
  const isHomePage = location.pathname === '/'
  // Contacts page should be fullscreen on mobile, no padding-top
  const isContactsPage = location.pathname === '/contacts'

  return (
    <div className={styles.layout}>
      <Header />
      <main className={`${styles.main} ${!isHomePage && !isContactsPage ? styles.mainNotHome : ''}`}>
        <Outlet />
      </main>
      {!isHomePage && !isContactsPage && <Footer slideIn={true} />}
      <CartSidebar />
      <AuthSidebar />
      <SearchOverlay />
      <ToastContainer />
    </div>
  )
}
