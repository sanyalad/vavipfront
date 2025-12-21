import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/store/cartStore'
import { useScroll } from '@/hooks/useScroll'
import { uzelCategories } from '@/data/uzelCatalog'
import { useUIStore } from '@/store/uiStore'
import { detectPlatform } from '@/utils/platform'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const lastScrollY = useRef(0)
  const hoverTimerRef = useRef<number | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const headerTopRef = useRef<HTMLDivElement | null>(null)
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null)
  const scrollLockYRef = useRef(0)
  const lastKnownYPos = useRef<number | null>(null);
  const isMouseInHeaderTopRef = useRef(false);
  const body = typeof document !== 'undefined' ? document.body : null

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!body) return
    if (isMobileMenuOpen) {
      body.classList.add('mobile-menu-scroll-lock')
    } else {
      body.classList.remove('mobile-menu-scroll-lock')
    }
    return () => {
      if (body) {
        body.classList.remove('mobile-menu-scroll-lock')
      }
    }
  }, [isMobileMenuOpen, body])

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
      addToast({ type: 'success', message: 'Номер скопирован в буфер обмена' })
    } catch {
      // ignore clipboard failures (permissions, etc.)
    }
  }, [addToast])

  const handlePhoneClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Detect platform using centralized utility
      const platformInfo = detectPlatform()
      
      // On mobile (Android/iOS), try to open tel: link first
      if (platformInfo.isMobile) {
        // Let the default tel: link behavior happen (opens dialer)
        // Also try to copy to clipboard as fallback
        void copyPhone()
        return
      }
      
      // On desktop (including Mac), try to open tel: link
      // If that fails (e.g., no phone app), copy to clipboard
      e.preventDefault()
      try {
        // Try to open tel: link programmatically
        const telLink = document.createElement('a')
        telLink.href = phoneHref
        telLink.style.display = 'none'
        document.body.appendChild(telLink)
        telLink.click()
        document.body.removeChild(telLink)
        // If we get here, the link was clicked but might not have opened
        // Wait a bit to see if it worked, then copy as fallback
        setTimeout(async () => {
          await copyPhone()
        }, 100)
      } catch {
        // If opening tel: fails, just copy
        await copyPhone()
      }
    },
    [copyPhone, phoneHref],
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

  // Prevent page scroll when dropdown is open (block wheel events)
  useEffect(() => {
    if (!activeMenu) return
    
    const dropdownPanel = dropdownPanelRef.current
    if (!dropdownPanel) return
    
    // Handle wheel events on the dropdown itself to allow scrolling
    const handleDropdownWheel = (e: WheelEvent) => {
      const canScroll = dropdownPanel.scrollHeight > dropdownPanel.clientHeight
      const isAtTop = dropdownPanel.scrollTop <= 0
      const isAtBottom = dropdownPanel.scrollTop >= dropdownPanel.scrollHeight - dropdownPanel.clientHeight - 1
      
      // If at boundaries and scrolling in that direction, prevent to avoid page scroll
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      // If dropdown can scroll and we're not at boundaries, allow scrolling inside dropdown
      if (canScroll) {
        // Don't prevent default or stop propagation - allow native scrolling inside dropdown
        // The document handler will check if event is inside dropdown and skip blocking
        return
      }
      // If dropdown can't scroll, prevent page scroll
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Handle wheel events outside dropdown to block page scroll
    const handleDocumentWheel = (e: WheelEvent) => {
      const target = e.target as Node | null
      
      // If event is inside dropdown, let dropdown handler deal with it
      if (dropdownPanel && target && dropdownPanel.contains(target)) {
        return
      }
      
      // Block page scroll when dropdown is open and event is not inside dropdown
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Add handler directly to dropdown to handle scrolling
    dropdownPanel.addEventListener('wheel', handleDropdownWheel, { passive: false })
    
    // Add handler to document to block page scroll for events outside dropdown
    document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true })
    
    return () => {
      dropdownPanel.removeEventListener('wheel', handleDropdownWheel)
      document.removeEventListener('wheel', handleDocumentWheel, { capture: true })
    }
  }, [activeMenu])

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
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {/* Top row */}
        <div
          className={styles.headerTop}
          ref={(el) => { headerTopRef.current = el; }}
          onMouseEnter={() => {
            isMouseInHeaderTopRef.current = true;
            if (activeMenu) {
              closeMenu();
            }
          }}
          onMouseLeave={() => {
            isMouseInHeaderTopRef.current = false;
          }}
        >
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
              <img src="/images/logo.png" alt="Логотип Vavip" data-intro-anchor="logo" />
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
          onMouseEnter={() => {
            clearHoverTimer();
            // Check if mouse is entering from the dropdown area (from below)
            if (activeMenu) {
              // Reset the flag as user is interacting with the header area
              isMouseInHeaderTopRef.current = false;
            }
          }}
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
                    // Все пункты меню показывают дропдаун по hover
                    scheduleMenu(item.id)
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
            onMouseEnter={() => {
              clearHoverTimer();
            }}
            // Close when cursor leaves the dropdown area only from the bottom or above the header.
            onMouseLeave={(e) => {
              const panel = dropdownPanelRef.current
              const headerTopEl = headerTopRef.current
              if (!panel || !headerTopEl) {
                closeMenu()
                return
              }
              
              const panelRect = panel.getBoundingClientRect()
              const headerTopRect = headerTopEl.getBoundingClientRect()
              
              // Store the last Y position to determine movement direction
              lastKnownYPos.current = e.clientY;
              
              // Close if cursor goes below the dropdown
              if (e.clientY >= panelRect.bottom - 2) {
                closeMenu()
              }
              // Close if cursor goes above the top row of the header (above the divider line)
              else if (e.clientY < headerTopRect.top) {
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

              {activeMenu === 'contacts' && (
                <div className={styles.dropdownContent}>
                  <div className={styles.dropdownHeader}>
                    <div>
                      <p className={styles.dropdownKicker}>Контакты</p>
                      <h3 className={styles.dropdownTitle}>Свяжитесь с нами</h3>
                      <p className={styles.dropdownLead}>
                        Выберите отдел для связи: узел ввода, монтаж, проектирование или магазин.
                      </p>
                      <div className={styles.dropdownActions}>
                        <Link to="/contacts" className={styles.dropdownPrimary}>
                          Перейти к контактам
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className={styles.dropdownLayout}>
                    <div className={styles.dropdownListBlock}>
                      <p className={styles.dropdownListTitle}>Отделы</p>
                      <ul className={styles.dropdownList}>
                        <li>
                          <Link to="/contacts?department=uzel" className={styles.dropdownListItem}>
                            <span className={styles.dropdownDot} />
                            <div className={styles.dropdownListTexts}>
                              <span className={styles.dropdownListName}>Узел ввода</span>
                              <span className={styles.dropdownListDesc}>Консультация и заказ</span>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/contacts?department=montazh" className={styles.dropdownListItem}>
                            <span className={styles.dropdownDot} />
                            <div className={styles.dropdownListTexts}>
                              <span className={styles.dropdownListName}>Монтаж</span>
                              <span className={styles.dropdownListDesc}>Установка и обслуживание</span>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/contacts?department=bim" className={styles.dropdownListItem}>
                            <span className={styles.dropdownDot} />
                            <div className={styles.dropdownListTexts}>
                              <span className={styles.dropdownListName}>Проектирование BIM</span>
                              <span className={styles.dropdownListDesc}>Разработка проектов</span>
                            </div>
                          </Link>
                        </li>
                        <li>
                          <Link to="/contacts?department=shop" className={styles.dropdownListItem}>
                            <span className={styles.dropdownDot} />
                            <div className={styles.dropdownListTexts}>
                              <span className={styles.dropdownListName}>Магазин</span>
                              <span className={styles.dropdownListDesc}>Заказы и доставка</span>
                            </div>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeMenu && activeMenu !== 'node' && activeMenu !== 'contacts' && (
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
        <div className={styles.mobileBarLeft}>
          <button
            className={`${styles.mobileBurgerBtn} ${isMobileMenuOpen ? styles.mobileBurgerBtnActive : ''}`}
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMobileMenuOpen}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsMobileMenuOpen(prev => {
                const newState = !prev
                console.log('Burger clicked, menu state:', newState)
                return newState
              })
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
            }}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        <div className={styles.mobileBarCenter}>
          <Link to="/" aria-label="Перейти на главную" onClick={() => setIsMobileMenuOpen(false)} data-intro-anchor="logo">
            <img src="/images/logo.png" alt="Логотип Vavip" loading="lazy" data-intro-anchor="logo" />
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className={`${styles.mobileMenuOverlay} ${styles.mobileMenuOverlayOpen}`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Menu */}
      <nav
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ''}`}
        aria-label="Главное меню"
      >
        <div className={styles.mobileMenuContent}>
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={styles.mobileMenuItem}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link
              to="/account"
              className={styles.mobileMenuItem}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ЛИЧНЫЙ КАБИНЕТ
            </Link>
          ) : (
            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                setIsMobileMenuOpen(false)
                openAuthDrawer('login')
              }}
            >
              ВХОД / РЕГИСТРАЦИЯ
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
