import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { dashboardApi } from '@/services/api'
import styles from './Dashboard.module.css'

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(30),
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => dashboardApi.getRecentOrders(5),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => dashboardApi.getTopProducts(5, 30),
  })

  return (
    <motion.div
      className={styles.dashboard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <h1 className={styles.title}>Панель управления</h1>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats?.total_users || 0}</span>
              <span className={styles.statLabel}>Пользователей</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats?.total_orders || 0}</span>
              <span className={styles.statLabel}>Заказов</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {stats?.revenue?.toLocaleString('ru-RU') || 0} ₽
              </span>
              <span className={styles.statLabel}>Выручка (30 дней)</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats?.pending_orders || 0}</span>
              <span className={styles.statLabel}>Ожидают обработки</span>
            </div>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Recent Orders */}
          <div className={styles.card}>
            <h2>Последние заказы</h2>
            <div className={styles.orderList}>
              {recentOrders?.map((order) => (
                <div key={order.id} className={styles.orderItem}>
                  <div>
                    <span className={styles.orderNumber}>#{order.order_number}</span>
                    <span className={styles.orderDate}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString('ru-RU')
                        : ''}
                    </span>
                  </div>
                  <span className={styles.orderTotal}>
                    {order.total.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
              {(!recentOrders || recentOrders.length === 0) && (
                <p className={styles.empty}>Нет заказов</p>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className={styles.card}>
            <h2>Топ продаж</h2>
            <div className={styles.productList}>
              {topProducts?.map((product, index) => (
                <div key={product.product_id} className={styles.productItem}>
                  <span className={styles.productRank}>{index + 1}</span>
                  <span className={styles.productName}>{product.product_name}</span>
                  <span className={styles.productSales}>
                    {product.total_quantity} шт.
                  </span>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <p className={styles.empty}>Нет данных</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}






