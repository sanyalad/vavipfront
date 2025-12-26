import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { totalItems } = useCartStore()
  const { openAuthDrawer, addToast, openSearch } = useUIStore()
  const { direction, scrollY } = useScroll()
  const [isHidden, setIsHidden] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isNavRevealed, setIsNavRevealed] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const lastScrollY = useRef(0)
  const hoverTimerRef = useRef<number | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const dropdownPanelRef = useRef<HTMLDivElement | null>(null)
  const scrollLockYRef = useRef(0)
  const body = typeof document !== 'undefined' ? document.body : null
  
  // Check if we're on contacts page
  const isContactsPage = location.pathname === '/contacts'
  // Check if we're on cart or checkout page (reduced header)
  const isReducedHeaderPage = location.pathname === '/cart' || location.pathname === '/checkout'
  const revealTimerRef = useRef<number | null>(null)

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

  const stopRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }, [])

  // Contacts page: keep top header (logo + top row) always visible.
  // Only reveal the *nav area* on hover.
  useEffect(() => {
    if (!isContactsPage) return
    setIsHidden(false)
    // Keep nav revealed while dropdown is open - update immediately
    if (activeMenu) {
      setIsNavRevealed(true)
    }
    return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContactsPage, isHovered, activeMenu])

  // Other pages: hide header on scroll down
  useEffect(() => {
    if (isContactsPage) return
    if (scrollY > 100 && direction === 'down' && !isHovered && !activeMenu) {
      setIsHidden(true)
    } else if (direction === 'up' || scrollY < 100 || isHovered || activeMenu) {
      setIsHidden(false)
    }
    lastScrollY.current = scrollY
  }, [scrollY, direction, isHovered, activeMenu, isContactsPage])

  const revealHeader = useCallback(() => {
    stopRevealTimer()
    setIsHovered(true)
    if (isContactsPage) setIsNavRevealed(true)
  }, [stopRevealTimer])

  const scheduleHideHeader = useCallback(() => {
    stopRevealTimer()
    // Small delay prevents flicker when moving from the reveal zone into the header.
    revealTimerRef.current = window.setTimeout(() => {
      setIsHovered(false)
      if (isContactsPage && !activeMenu) setIsNavRevealed(false)
      revealTimerRef.current = null
    }, 120)
  }, [stopRevealTimer, isContactsPage, activeMenu])

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const closeMenuTimerRef = useRef<number | null>(null)

  const scheduleCloseMenu = useCallback(() => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current)
    }
    closeMenuTimerRef.current = window.setTimeout(() => {
      // Only close if no menu item is hovered and no menu is being opened
      if (!hoverTimerRef.current) {
        setActiveMenu(null)
      }
      closeMenuTimerRef.current = null
    }, 200) // Small delay to allow smooth transition between menu items
  }, [])

  const cancelCloseMenu = useCallback(() => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current)
      closeMenuTimerRef.current = null
    }
  }, [])

  const closeMenu = useCallback(() => {
    clearHoverTimer()
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current)
      closeMenuTimerRef.current = null
    }
    setActiveMenu(null)
  }, [clearHoverTimer])

  // Keep CSS var for dropdown positioning in sync with real header height
  const updateHeaderHeight = useCallback(() => {
    const headerEl = headerRef.current
    if (headerEl) {
      // When on cart or checkout page, only calculate the height of the visible part (headerTop)
      let h = 0
      if (isReducedHeaderPage) {
        // Calculate only the height of the top row when on cart/checkout page
        const headerTopEl = headerEl.querySelector(`.${styles.headerTop}`) as HTMLElement | null
        h = headerTopEl ? headerTopEl.offsetHeight + 8 : 0 // +8 for margin-bottom
      } else {
        h = headerEl.offsetHeight
      }
      document.documentElement.style.setProperty('--header-h', h + 'px')
    }
  }, [isReducedHeaderPage])

  const scheduleMenu = useCallback(
    (id: string | null) => {
      clearHoverTimer()
      cancelCloseMenu() // Cancel any pending close when opening new menu
      hoverTimerRef.current = window.setTimeout(() => {
        setActiveMenu(id)
        // On contacts page, update header height immediately when menu opens
        if (isContactsPage && id) {
          requestAnimationFrame(() => {
            updateHeaderHeight()
            requestAnimationFrame(() => {
              updateHeaderHeight()
            })
          })
        }
        hoverTimerRef.current = null
      }, 140)
    },
    [clearHoverTimer, cancelCloseMenu, isContactsPage, updateHeaderHeight],
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
  // Allow scrolling inside dropdown, block scrolling outside
  useEffect(() => {
    if (!activeMenu) return
    
    const dropdownPanel = dropdownPanelRef.current
    if (!dropdownPanel) return
    
    // Handle wheel events - allow scrolling inside dropdown, block outside
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Node | null
      
      // Check if event is inside dropdown panel or its children
      if (dropdownPanel && target && dropdownPanel.contains(target)) {
        // Inside dropdown - check if we can scroll
        const scrollHeight = dropdownPanel.scrollHeight
        const clientHeight = dropdownPanel.clientHeight
        const scrollTop = dropdownPanel.scrollTop
        const canScroll = scrollHeight > clientHeight
        
        // Calculate if we're at boundaries (with small threshold for better UX)
        const threshold = 1
        const isAtTop = scrollTop <= threshold
        const isAtBottom = scrollTop >= scrollHeight - clientHeight - threshold
        
        // If at top and scrolling up, or at bottom and scrolling down - prevent
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        
        // If dropdown can scroll and we're not at boundaries, allow native scrolling
        if (canScroll) {
          // Let native scrolling happen - don't prevent
          return
        }
        
        // Dropdown can't scroll - prevent to avoid page scroll
        e.preventDefault()
        e.stopPropagation()
        return
      }
      
      // Outside dropdown - always block page scroll
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Use capture phase to catch all wheel events
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true })
    }
  }, [activeMenu])

  useEffect(() => {
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => window.removeEventListener('resize', updateHeaderHeight)
  }, [updateHeaderHeight])

  // Update header height when dropdown opens/closes to prevent gap artifacts
  useEffect(() => {
    if (activeMenu) {
      // When dropdown opens, update height immediately and then again after a short delay
      // to account for any transitions
      updateHeaderHeight()
      requestAnimationFrame(() => {
        updateHeaderHeight()
        // One more update after transition might have started
        requestAnimationFrame(() => {
          updateHeaderHeight()
        })
      })
    } else {
      // When dropdown closes, update height
      requestAnimationFrame(() => {
        updateHeaderHeight()
      })
    }
  }, [activeMenu, updateHeaderHeight])

  // Also update header height when nav visibility changes on contacts page
  useEffect(() => {
    if (isContactsPage) {
      // Use double RAF to ensure transitions have started/completed
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateHeaderHeight()
        })
      })
    }
  }, [isNavRevealed, isContactsPage, updateHeaderHeight])

  const headerClasses = [
    styles.header,
    isContactsPage && styles.headerOverlay,
    !isContactsPage && isHidden && styles.headerHidden,
    isContactsPage && (isNavRevealed || !!activeMenu) && styles.headerNavVisible,
    // On contacts overlay: keep semi-transparent on hover; go solid only when dropdown is open.
    (isContactsPage ? !!activeMenu : (isHovered || !!activeMenu)) && styles.headerSolid,
    isReducedHeaderPage && styles.headerCartPage,
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* Contacts page: invisible hover zone at the very top to reveal header without scrolling */}
      {isContactsPage && (
        <div
          className={styles.headerRevealZone}
          onMouseEnter={revealHeader}
          onMouseLeave={scheduleHideHeader}
          aria-hidden="true"
        />
      )}
      <header 
        id="main-header"
        className={headerClasses}
        ref={(el) => { headerRef.current = el }}
        onMouseEnter={revealHeader}
        onMouseLeave={(e) => {
          scheduleHideHeader()
          // Close dropdown if mouse leaves header area (but not if moving to dropdown)
          if (activeMenu) {
            const relatedTarget = e.relatedTarget as Node | null
            const dropdownPanel = dropdownPanelRef.current
            // Check if mouse is moving to dropdown panel
            if (!dropdownPanel || (relatedTarget && !dropdownPanel.contains(relatedTarget))) {
              // Mouse is leaving header and not going to dropdown - close it
              closeMenu()
            }
          }
        }}
      >
        {/* Top row */}
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            {/* Location button */}
            <button className={styles.iconBtn} type="button" aria-label="Выбрать локацию">
              <svg className={styles.locationIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
              <motion.svg 
                viewBox="0 0 24 24" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                aria-hidden="true"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <path d="M8 7V5a4 4 0 018 0v2"/>
                <rect x="3" y="7" width="18" height="14" rx="2" ry="2"/>
              </motion.svg>
              <AnimatePresence mode="popLayout">
                {cartCount > 0 && (
                  <motion.span 
                    key={cartCount}
                    className={styles.cartBadge}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    data-cart-badge
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            
            {/* Search */}
            <button aria-label="Поиск" className={styles.iconLink} onClick={openSearch} type="button">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="7.5"/>
                <line x1="16" y1="16" x2="21" y2="21" stroke="#c0c0c0" strokeWidth="2"/>
              </svg>
            </button>
            
            {/* Account */}
            {isAuthenticated ? (
              <Link to="/account" aria-label="Личный кабинет" className={styles.iconLink}>
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
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
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
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
          className={`${styles.navArea} ${activeMenu ? styles.navHovering : ''}`}
          // Important: do NOT close on navArea mouseleave. The dropdown is fixed-position and
          // sits outside navArea's box, so closing here makes it "impossible to catch".
          onMouseEnter={() => {
            clearHoverTimer()
            cancelCloseMenu() // Keep menu open when cursor is in navArea
          }}
          onMouseLeave={(e) => {
            // Only schedule close if cursor is really leaving navArea
            // Check if related target is not within navArea
            const relatedTarget = e.relatedTarget as Node | null
            const navArea = e.currentTarget
            if (relatedTarget && navArea.contains(relatedTarget)) {
              return // Cursor is moving to child element, don't close
            }
            scheduleCloseMenu()
          }}
        >
          <nav className={styles.headerBottom} role="navigation" aria-label="Главное меню">
            {menuItems.map((item) => (
                <div
                key={item.id}
                className={styles.menuItemWrapper}
                onMouseEnter={() => {
                  cancelCloseMenu() // Cancel close when hovering menu item
                  setHoveredMenuItem(item.id)
                }}
                onMouseLeave={(e) => {
                  // Only clear if really leaving wrapper (moving to another wrapper)
                  const relatedTarget = e.relatedTarget as Node | null
                  const navArea = e.currentTarget.closest(`.${styles.navArea}`) as HTMLElement | null
                  if (!navArea || (relatedTarget && navArea.contains(relatedTarget))) {
                    // Still within navArea, just clearing hover state
                    setHoveredMenuItem(null)
                  } else {
                    // Leaving navArea
                    setHoveredMenuItem(null)
                  }
                }}
              >
                <Link 
                  to={item.href}
                  className={`${styles.menuItemButton} ${activeMenu === item.id ? styles.active : ''} ${hoveredMenuItem === item.id ? styles.menuItemHovered : ''}`}
                  onMouseEnter={(e) => {
                    // Все пункты меню показывают дропдаун по hover
                    cancelCloseMenu() // Cancel any pending close
                    scheduleMenu(item.id)
                    setHoveredMenuItem(item.id)
                  }}
                  onMouseLeave={(e) => {
                    // Don't immediately clear timer - allow smooth transition to adjacent menu items
                    // Only clear if moving outside navArea
                    const relatedTarget = e.relatedTarget as Node | null
                    const navArea = e.currentTarget.closest(`.${styles.navArea}`) as HTMLElement | null
                    if (!navArea || (relatedTarget && navArea.contains(relatedTarget))) {
                      // Moving to another menu item or staying in navArea
                      setHoveredMenuItem(null)
                    } else {
                      // Moving outside navArea - schedule close
                      clearHoverTimer()
                      setHoveredMenuItem(null)
                      scheduleCloseMenu()
                    }
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
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M6.6 10.8c1.6 3 3.6 5 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.1-.2 1 .4 2.1.7 3.2.8.5.1.9.5.9 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3c0-.6.4-1 1-1h3.2c.5 0 .9.4 1 .9.2 1.1.4 2.2.8 3.2.1.4 0 .8-.2 1.1L6.6 10.8z" fill="#fff"/>
            </svg>
          </a>
          <button className={styles.mobileIconBtn} aria-label="Поиск" type="button" onClick={openSearch}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
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
