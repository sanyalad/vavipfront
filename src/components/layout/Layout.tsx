import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import CartSidebar from '../features/Cart/CartSidebar'
import ToastContainer from '../ui/Toast/ToastContainer'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  
  // Home page has its own footer in the video sections wrapper
  const isHomePage = location.pathname === '/'

  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      {!isHomePage && <Footer />}
      <CartSidebar />
      <ToastContainer />
    </div>
  )
}
