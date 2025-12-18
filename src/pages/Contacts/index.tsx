import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { detectPlatform } from '@/utils/platform'
import styles from './Contacts.module.css'

type Department = 'uzel' | 'montazh' | 'bim' | 'shop'
type Country = 'russia' | 'kazakhstan' | 'belarus' | 'georgia' | 'uae'

interface DepartmentOption {
  id: Department
  label: string
  needsLocation: boolean // true = нужен выбор страны/города
}

const departments: DepartmentOption[] = [
  { id: 'uzel', label: 'Узел ввода', needsLocation: true },
  { id: 'montazh', label: 'Монтаж', needsLocation: true },
  { id: 'bim', label: 'Проектирование', needsLocation: false },
  { id: 'shop', label: 'Магазин', needsLocation: false },
]

const countries: { id: Country; label: string }[] = [
  { id: 'russia', label: 'Россия' },
  { id: 'kazakhstan', label: 'Казахстан' },
  { id: 'belarus', label: 'Беларусь' },
  { id: 'georgia', label: 'Грузия' },
  { id: 'uae', label: 'ОАЭ' },
]

const citiesByCountry: Record<Country, string[]> = {
  russia: ['Москва', 'Санкт-Петербург', 'Краснодар', 'Ростов-на-Дону', 'Самара', 'Воронеж'],
  kazakhstan: ['Астана', 'Алматы', 'Актобе'],
  belarus: ['Минск', 'Гомель', 'Брест'],
  georgia: ['Тбилиси', 'Батуми', 'Кутаиси'],
  uae: ['Дубай', 'Абу-Даби', 'Шарджа'],
}

const phoneMap: Record<Country, Record<Department, string>> = {
  russia: { montazh: '+7 111 111 11 11', uzel: '+7 122 222 22 22', bim: '+7 133 333 33 33', shop: '+7 144 444 44 44' },
  kazakhstan: { montazh: '+7 211 111 11 11', uzel: '+7 222 222 22 22', bim: '+7 233 333 33 33', shop: '+7 244 444 44 44' },
  belarus: { montazh: '+375 31 111 11 11', uzel: '+375 32 222 22 22', bim: '+375 33 333 33 33', shop: '+375 34 444 44 44' },
  georgia: { montazh: '+995 411 111 111', uzel: '+995 422 222 222', bim: '+995 433 333 333', shop: '+995 444 444 444' },
  uae: { montazh: '+971 51 111 1111', uzel: '+971 52 222 2222', bim: '+971 53 333 3333', shop: '+971 54 444 4444' },
}

// Для bim и shop — единые контакты без привязки к стране
const globalContacts: Partial<Record<Department, { phone: string; email: string }>> = {
  bim: { phone: '+7 931 248 70 13', email: 'bim@vavip.ru' },
  shop: { phone: '+7 931 248 70 13', email: 'shop@vavip.ru' },
}

type Step = 'department' | 'country' | 'city' | 'contacts'

export default function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToast } = useUIStore()
  const [step, setStep] = useState<Step>('department')
  const [department, setDepartment] = useState<Department | null>(null)
  const [country, setCountry] = useState<Country | null>(null)
  const [city, setCity] = useState<string | null>(null)

  const selectedDept = departments.find((d) => d.id === department)

  // Initialize from URL parameter or pathname
  useEffect(() => {
    // Check URL pathname first (for /services/bim, /services/montazh)
    const pathname = window.location.pathname
    let deptParam: Department | null = null
    
    if (pathname === '/services/bim') {
      deptParam = 'bim'
    } else if (pathname === '/services/montazh') {
      deptParam = 'montazh'
    } else {
      // Fallback to URL search params
      deptParam = searchParams.get('department') as Department | null
    }
    
    if (deptParam && departments.some((d) => d.id === deptParam)) {
      const dept = departments.find((d) => d.id === deptParam)
      if (dept) {
        setDepartment(deptParam)
        if (dept.needsLocation) {
          setStep('country')
        } else {
          setStep('contacts')
        }
      }
    }
  }, [searchParams])

  const handleDepartmentSelect = (dept: DepartmentOption) => {
    setDepartment(dept.id)
    if (dept.needsLocation) {
      setStep('country')
    } else {
      // bim/shop — сразу показываем контакты
      setStep('contacts')
    }
  }

  const handleCountrySelect = (c: Country) => {
    setCountry(c)
    setStep('city')
  }

  const handleCitySelect = (c: string) => {
    setCity(c)
    setStep('contacts')
  }

  const handleBack = () => {
    if (step === 'contacts') {
      if (selectedDept?.needsLocation) {
        setStep('city')
      } else {
        setStep('department')
        setDepartment(null)
      }
    } else if (step === 'city') {
      setStep('country')
      setCity(null)
    } else if (step === 'country') {
      setStep('department')
      setDepartment(null)
      setCountry(null)
    }
  }

  const handleReset = () => {
    setStep('department')
    setDepartment(null)
    setCountry(null)
    setCity(null)
  }

  // Получаем телефон
  const getPhone = () => {
    if (!department) return ''
    if (selectedDept?.needsLocation && country) {
      return phoneMap[country]?.[department] ?? ''
    }
    return globalContacts[department]?.phone ?? ''
  }

  const getEmail = () => {
    if (!department) return ''
    return globalContacts[department]?.email ?? ''
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  }

  return (
    <motion.div
      className={styles.contactsPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Контакты</h1>

        <AnimatePresence mode="wait">
          {/* Шаг 1: Выбор отдела — горизонтальные плитки */}
          {step === 'department' && (
            <motion.div
              key="department"
              className={styles.stepContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className={styles.stepQuestion}>Куда вы хотите позвонить?</p>
              <div className={`${styles.optionsGrid} ${styles.departmentGrid}`}>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    className={styles.optionButton}
                    onClick={() => handleDepartmentSelect(dept)}
                  >
                    {dept.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Шаг 2: Выбор страны */}
          {step === 'country' && (
            <motion.div
              key="country"
              className={styles.stepContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className={styles.stepQuestion}>Выберите страну</p>
              <div className={`${styles.optionsGrid} ${styles.secondaryGrid}`}>
                {countries.map((c) => (
                  <button
                    key={c.id}
                    className={styles.optionButton}
                    onClick={() => handleCountrySelect(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <button className={styles.backButton} onClick={handleBack}>
                Назад
              </button>
            </motion.div>
          )}

          {/* Шаг 3: Выбор города */}
          {step === 'city' && country && (
            <motion.div
              key="city"
              className={styles.stepContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className={styles.stepQuestion}>Выберите город</p>
              <div className={`${styles.optionsGrid} ${styles.secondaryGrid}`}>
                {citiesByCountry[country].map((c) => (
                  <button
                    key={c}
                    className={styles.optionButton}
                    onClick={() => handleCitySelect(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button className={styles.backButton} onClick={handleBack}>
                Назад
              </button>
            </motion.div>
          )}

          {/* Шаг 4: Контакты */}
          {step === 'contacts' && (
            <motion.div
              key="contacts"
              className={styles.stepContent}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className={styles.contactsCard}>
                <p className={styles.contactsLabel}>
                  {selectedDept?.label}
                  {city && country && ` · ${city}`}
                </p>
                
                <a 
                  href={`tel:${getPhone().replace(/\s/g, '')}`} 
                  className={styles.phoneNumber}
                  onClick={async (e) => {
                    const phoneNumber = getPhone().replace(/\s/g, '')
                    // Detect platform using centralized utility
                    const platformInfo = detectPlatform()
                    
                    // Helper function to copy phone with notification
                    const copyPhoneWithNotification = async () => {
                      try {
                        if (navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(getPhone())
                        } else {
                          const ta = document.createElement('textarea')
                          ta.value = getPhone()
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
                        // ignore clipboard failures
                      }
                    }
                    
                    // On mobile, let tel: link work normally
                    if (platformInfo.isMobile) {
                      // Try to copy as well
                      await copyPhoneWithNotification()
                      return
                    }
                    
                    // On desktop (including Mac), try tel: first, then copy
                    e.preventDefault()
                    try {
                      const telLink = document.createElement('a')
                      telLink.href = `tel:${phoneNumber}`
                      telLink.style.display = 'none'
                      document.body.appendChild(telLink)
                      telLink.click()
                      document.body.removeChild(telLink)
                      setTimeout(async () => {
                        await copyPhoneWithNotification()
                      }, 100)
                    } catch {
                      // If tel: fails, just copy
                      await copyPhoneWithNotification()
                    }
                  }}
                >
                  {getPhone()}
                </a>
                
                {getEmail() && (
                  <a href={`mailto:${getEmail()}`} className={styles.emailLink}>
                    {getEmail()}
                  </a>
                )}
                
                <p className={styles.workHours}>Ежедневно с 8:00 до 22:00</p>
                
                {/* Social Links */}
                <div className={styles.socialLinks}>
                  <a 
                    href="https://t.me/karen_vavip" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label="Telegram"
                  >
                    <img src="/images/icons/telegram.svg" alt="Telegram" />
                  </a>
                  <a 
                    href="https://instagram.com/karen_vavip" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label="Instagram"
                  >
                    <img src="/images/icons/instagram.svg" alt="Instagram" />
                  </a>
                  <a 
                    href="https://vk.com/karen_vavip" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label="VKontakte"
                  >
                    <img src="/images/icons/vk.svg" alt="VK" />
                  </a>
                </div>
              </div>
              
              <button className={styles.resetButton} onClick={handleReset}>
                Выбрать другой отдел
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
