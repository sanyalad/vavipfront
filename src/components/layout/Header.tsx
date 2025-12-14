import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/store/cartStore'
import { useScroll } from '@/hooks/useScroll'
import { uzelCategories } from '@/data/uzelCatalog'
import { useUIStore } from '@/store/uiStore'
import styles from './Header.module.css'

const menuItems = [
  { id: 'contacts', label: 'КОНТАКТЫ', href: '/contacts' },
  { id: 'about', label: 'О КОМПАНИИ', href: '/about' },
  { id: 'node', label: 'УЗЕЛ ВВОДА', href: '/catalog/uzel-vvoda' },
  { id: 'bim', label: 'ПРОЕКТИРОВАНИЕ BIM', href: '/services/bim' },
  { id: 'montage', label: 'МОНТАЖ', href: '/services/montazh' },
  { id: 'shop', label: 'МАГАЗИН', href: '/shop' },
]

export default function Header() {
  const { isAuthenticated } = useAuth()
  const { totalItems } = useCartStore()
  const { openAuthDrawer, addToast, openSearch } = useUIStore()
  const { direction, scrollY } = useScroll()
  const [isHidden, setIsHidden] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const lastScrollY = useRef(0)
  const hoverTimerRef = useRef<number | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null)
  const scrollLockYRef = useRef(0)
  const body = typeof document !== 'undefined' ? document.body : null

  const cartCount = totalItems()
  const phoneText = '+7 931 248 70 13'
  const phoneHref = 'tel:+79312487013'

  const copyPhone = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(phoneText)
      } else {
        const ta = document.createElement('textarea')
        ta.value = phoneText
        ta.setAttribute('readonly', 'true')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      addToast({ type: 'success', message: 'Номер скопирован' })
    } catch {
      // ignore clipboard failures (permissions, etc.)
    }
  }, [addToast])

  const handlePhoneClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (!isMobile) {
        // Desktop: copy only (don't try to open tel:)
        e.preventDefault()
        await copyPhone()
        return
      }
      // Mobile: try to copy and let tel: happen (open dialer)
      void copyPhone()
    },
    [copyPhone],
  )

  // Hide header on scroll down
  useEffect(() => {
    if (scrollY > 100 && direction === 'down' && !isHovered && !activeMenu) {
      setIsHidden(true)
    } else if (direction === 'up' || scrollY < 100 || isHovered || activeMenu) {
      setIsHidden(false)
    }
    lastScrollY.current = scrollY
  }, [scrollY, direction, isHovered, activeMenu])

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const closeMenu = useCallback(() => {
    clearHoverTimer()
    setActiveMenu(null)
  }, [clearHoverTimer])

  const scheduleMenu = useCallback(
    (id: string | null) => {
      clearHoverTimer()
      hoverTimerRef.current = window.setTimeout(() => {
        setActiveMenu(id)
        hoverTimerRef.current = null
      }, 140)
    },
    [clearHoverTimer],
  )

  // Lock body scroll when dropdown is open
  useEffect(() => {
    if (!body) return
    if (activeMenu) {
      scrollLockYRef.current = window.scrollY || 0
      document.documentElement.style.setProperty('--scroll-lock-top', `-${scrollLockYRef.current}px`)
      body.classList.add('dropdown-scroll-lock')
    } else {
      body.classList.remove('dropdown-scroll-lock')
      document.documentElement.style.setProperty('--scroll-lock-top', '0px')
      window.scrollTo(0, scrollLockYRef.current)
    }
    return () => {
      body.classList.remove('dropdown-scroll-lock')
      document.documentElement.style.setProperty('--scroll-lock-top', '0px')
    }
  }, [activeMenu, body])

  // Keep CSS var for dropdown positioning in sync with real header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerEl = headerRef.current
      const h = headerEl?.offsetHeight || 0
      document.documentElement.style.setProperty('--header-h', h + 'px')
    }
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => window.removeEventListener('resize', updateHeaderHeight)
  }, [])

  const headerClasses = [
    styles.header,
    isHidden && styles.headerHidden,
    (isHovered || activeMenu) && styles.headerSolid,
  ].filter(Boolean).join(' ')

  return (
    <>
      <header 
        id="main-header"
        className={headerClasses}
        ref={(el) => { headerRef.current = el }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top row */}
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            {/* Location button */}
            <button className={styles.iconBtn} type="button" aria-label="Выбрать локацию">
              <svg className={styles.locationIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z"/>
              </svg>
            </button>

            <div className={styles.phoneNumber}>
              <a href={phoneHref} onClick={handlePhoneClick}>
                {phoneText}
              </a>
            </div>
          </div>

          <div className={styles.headerCenter}>
            <Link
              to="/"
              data-intro-anchor="logo"
              onClick={(e) => {
                // Client request: logo acts as a "refresh" (and always returns to home).
                // If we're already on '/', reload; otherwise hard-navigate to '/'.
                e.preventDefault()
                if (window.location.pathname === '/') window.location.reload()
                else window.location.assign('/')
              }}
            >
              <img src="/images/logo.png" alt="Логотип Vavip" />
            </Link>
          </div>

          <div className={styles.headerRight}>
            {/* Cart (separate page like BORK) */}
            <Link to="/cart" aria-label="Корзина" className={styles.iconLink}>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 7V5a4 4 0 018 0v2"/>
                <rect x="3" y="7" width="18" height="14" rx="2" ry="2"/>
              </svg>
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </Link>
            
            {/* Search */}
            <button aria-label="Поиск" className={styles.iconLink} onClick={openSearch} type="button">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="7.5"/>
                <line x1="16" y1="16" x2="21" y2="21" stroke="#c0c0c0" strokeWidth="2"/>
              </svg>
            </button>
            
            {/* Account */}
            {isAuthenticated ? (
              <Link to="/account" aria-label="Личный кабинет" className={styles.iconLink}>
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 8-4 8-4s8 0 8 4"/>
                </svg>
              </Link>
            ) : (
              <button
                type="button"
                aria-label="Вход / регистрация"
                className={styles.iconLink}
                onClick={() => openAuthDrawer('login')}
              >
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 8-4 8-4s8 0 8 4"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className={styles.centerDivider} />

        {/* Navigation + dropdowns */}
        <div 
          className={styles.navArea}
          // Important: do NOT close on navArea mouseleave. The dropdown is fixed-position and
          // sits outside navArea's box, so closing here makes it "impossible to catch".
          onMouseEnter={() => clearHoverTimer()}
        >
          <nav className={styles.headerBottom} role="navigation" aria-label="Главное меню">
            {menuItems.map((item) => (
              <div key={item.id} className={styles.menuItemWrapper}>
                <Link 
                  to={item.href}
                  className={`${styles.menuItemButton} ${activeMenu === item.id ? styles.active : ''}`}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget
                    const navArea = target.closest(`.${styles.navArea}`) as HTMLElement | null
                    if (navArea) {
                      navArea.classList.add(styles.navHovering)
                    }
                    scheduleMenu(item.id === 'contacts' ? null : item.id)
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget
                    const navArea = target.closest(`.${styles.navArea}`) as HTMLElement | null
                    if (navArea) {
                      navArea.classList.remove(styles.navHovering)
                    }
                    clearHoverTimer()
                  }}
                  onClick={() => {
                    closeMenu()
                  }}
                >
                  <span className={styles.menuLabel}>{item.label}</span>
                </Link>
              </div>
            ))}
          </nav>

          <div
            ref={(el) => {
              dropdownPanelRef.current = el
            }}
            className={`${styles.dropdownPanel} ${activeMenu ? styles.dropdownVisible : ''}`}
            // Keep dropdown open while cursor is inside the panel.
            onMouseEnter={() => clearHoverTimer()}
            // Close only when cursor goes BELOW the dropdown bottom edge.
            onMouseLeave={(e) => {
              const panel = dropdownPanelRef.current
              if (!panel) {
                closeMenu()
                return
              }
              const rect = panel.getBoundingClientRect()
              // If user moves back up into the header/menu, do not close.
              if (e.clientY < rect.top) return
              // Close only when leaving through the bottom boundary.
              if (e.clientY >= rect.bottom - 2) {
                closeMenu()
              }
            }}
          >
            <div className={styles.dropdownOverlay} aria-hidden="true" />
            <div className={styles.dropdownContainer}>
              {activeMenu === 'node' && (
                <div className={styles.dropdownContent}>
                  <div className={styles.dropdownHeader}>
                    <div>
                      <p className={styles.dropdownKicker}>Узлы ввода</p>
                      <h3 className={styles.dropdownTitle}>Каталог исполнений</h3>
                      <p className={styles.dropdownLead}>
                        Счётчики, фильтрация, подготовка под умный дом и премиальная отделка.
                      </p>
                      <div className={styles.dropdownActions}>
                        <Link to="/catalog/uzel-vvoda" className={styles.dropdownPrimary}>
                          Открыть каталог
                        </Link>
                        <Link to="/contacts" className={styles.dropdownSecondary}>
                          Консультация
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className={styles.dropdownLayout}>
                    <div className={styles.dropdownListBlock}>
                      <p className={styles.dropdownListTitle}>Категории</p>
                      <ul className={styles.dropdownList}>
                        {uzelCategories.map((item) => (
                          <li key={item.slug}>
                            <Link to={`/catalog/uzel-vvoda/${item.slug}`} className={styles.dropdownListItem}>
                              <span className={styles.dropdownDot} />
                              <div className={styles.dropdownListTexts}>
                                <span className={styles.dropdownListName}>{item.title}</span>
                                <span className={styles.dropdownListDesc}>{item.description}</span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeMenu && activeMenu !== 'node' && (
                <div className={styles.dropdownContent}>
                  <div className={styles.dropdownSimple}>
                    <p className={styles.dropdownKicker}>Раздел</p>
                    <h3 className={styles.dropdownTitle}>
                      {menuItems.find((i) => i.id === activeMenu)?.label}
                    </h3>
                    <p className={styles.dropdownLead}>Перейдите по клику, превью показано для навигации.</p>
                    <Link 
                      to={menuItems.find((i) => i.id === activeMenu)?.href || '/'} 
                      className={styles.dropdownPrimary}
                    >
                      Открыть раздел
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bar */}
      <div className={styles.mobileBar} role="banner" aria-label="Мобильная шапка сайта">
        <div className={styles.mobileBarCenter}>
          <Link to="/" aria-label="Перейти на главную">
            <img src="/images/logo.png" alt="Логотип Vavip" width="120" height="40" loading="lazy" />
          </Link>
        </div>
        <div className={styles.mobileBarRight}>
          <a href="tel:+79312487013" className={styles.mobileIconBtn} aria-label="Позвонить">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6.6 10.8c1.6 3 3.6 5 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.1-.2 1 .4 2.1.7 3.2.8.5.1.9.5.9 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3c0-.6.4-1 1-1h3.2c.5 0 .9.4 1 .9.2 1.1.4 2.2.8 3.2.1.4 0 .8-.2 1.1L6.6 10.8z" fill="#fff"/>
            </svg>
          </a>
          <button className={styles.mobileIconBtn} aria-label="Поиск" type="button" onClick={openSearch}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="7.5" stroke="#fff" strokeWidth="2" fill="none"/>
              <line x1="16" y1="16" x2="21" y2="21" stroke="#fff" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
