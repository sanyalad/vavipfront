import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

// Layout
import Layout from './components/layout/Layout'

// Pages - Lazy loaded for code splitting
const HomePage = lazy(() => import('./pages/Home'))
const ShopPage = lazy(() => import('./pages/Shop'))
const ProductPage = lazy(() => import('./pages/Product'))
const CartPage = lazy(() => import('./pages/Cart'))
const CheckoutPage = lazy(() => import('./pages/Checkout'))
const ContactsPage = lazy(() => import('./pages/Contacts'))
const UzelCatalogPage = lazy(() => import('./pages/UzelCatalog'))
const LoginPage = lazy(() => import('./pages/auth/Login'))
const RegisterPage = lazy(() => import('./pages/auth/Register'))
const AccountPage = lazy(() => import('./pages/Account'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const NotFoundPage = lazy(() => import('./pages/NotFound'))

// Hooks
import { useAuth } from './hooks/useAuth'

// Components
import ProtectedRoute from './components/auth/ProtectedRoute'
import IntroLoader from './components/animations/IntroLoader'

function App() {
  const location = useLocation()
  const { isLoading } = useAuth()

  return (
    <>
      <IntroLoader />
      {!isLoading && (
        <AnimatePresence mode="wait">
          <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="shop" element={<ShopPage />} />
                <Route path="shop/product/:slug" element={<ProductPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                } />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="catalog/uzel-vvoda" element={<UzelCatalogPage />} />
                <Route path="catalog/uzel-vvoda/:categorySlug" element={<UzelCatalogPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="account/*" element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                } />
                <Route path="dashboard/*" element={
                  <ProtectedRoute requireAdmin>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AnimatePresence>
      )}
    </>
  )
}

export default App

