import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { detectPlatform } from '@/utils/platform'
import { spring } from '@/utils/spring'
import styles from './Contacts.module.css'

type Department = 'uzel' | 'montazh' | 'bim' | 'shop'
type Country = 'russia' | 'kazakhstan' | 'belarus' | 'georgia' | 'uae'

interface DepartmentOption {
  id: Department
  label: string
  needsLocation: boolean
  description: string
}

const departments: DepartmentOption[] = [
  { id: 'uzel', label: 'Узел ввода', needsLocation: true, description: 'Комплектные узлы ввода' },
  { id: 'montazh', label: 'Монтаж', needsLocation: true, description: 'Монтажные работы' },
  { id: 'bim', label: 'Проектирование', needsLocation: false, description: 'BIM проектирование' },
  { id: 'shop', label: 'Магазин', needsLocation: false, description: 'Интернет-магазин' },
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

const globalContacts: Partial<Record<Department, { phone: string; email: string }>> = {
  bim: { phone: '+7 931 248 70 13', email: 'bim@vavip.ru' },
  shop: { phone: '+7 931 248 70 13', email: 'shop@vavip.ru' },
}

type Step = 'department' | 'country' | 'city' | 'contacts'

// Ripple effect component
function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className={styles.ripple}
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ left: x, top: y }}
    />
  )
}

export default function ContactsPage() {
  const [searchParams] = useSearchParams()
  const { addToast } = useUIStore()
  const [step, setStep] = useState<Step>('department')
  const [department, setDepartment] = useState<Department | null>(null)
  const [country, setCountry] = useState<Country | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; targetId: Department }[]>([])
  const rippleIdRef = useRef(0)

  const selectedDept = departments.find((d) => d.id === department)

  // Initialize from URL parameter or pathname
  useEffect(() => {
    const pathname = window.location.pathname
    let deptParam: Department | null = null
    
    if (pathname === '/services/bim') {
      deptParam = 'bim'
    } else if (pathname === '/services/montazh') {
      deptParam = 'montazh'
    } else {
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

  const addRipple = useCallback((targetId: Department, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = rippleIdRef.current++
    setRipples((prev) => [...prev, { id, x, y, targetId }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)
  }, [])

  const handleDepartmentSelect = (dept: DepartmentOption, e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(dept.id, e)
    setTimeout(() => {
      setDepartment(dept.id)
      if (dept.needsLocation) {
        setStep('country')
      } else {
        setStep('contacts')
      }
    }, 150)
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

  // Animation variants for large department blocks
  const blockContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
        duration: 0.3,
      },
    },
  }

  const blockVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: spring.heavy,
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: -20,
      transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
    },
  }

  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        ...spring.medium,
        staggerChildren: 0.05,
      },
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -15,
      transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: spring.light,
    },
  }

  return (
    <motion.div
      className={styles.contactsPage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Department selection - Large 2x2 grid blocks */}
        {step === 'department' && (
          <motion.div
            key="department"
            className={styles.fullscreenStep}
            variants={blockContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className={styles.departmentGridLarge}>
              {departments.map((dept, index) => (
                <motion.button
                  key={dept.id}
                  className={styles.departmentBlock}
                  data-index={index}
                  variants={blockVariants}
                  whileHover={{ 
                    scale: 1.03,
                    y: -8,
                    transition: spring.light,
                  }}
                  whileTap={{ 
                    scale: 0.97,
                    transition: { duration: 0.1 },
                  }}
                  onClick={(e) => handleDepartmentSelect(dept, e)}
                >
                  <span className={styles.blockLabel}>{dept.label}</span>
                  <span className={styles.blockDescription}>{dept.description}</span>
                  {ripples
                    .filter((ripple) => ripple.targetId === dept.id)
                    .map((ripple) => (
                      <Ripple key={ripple.id} x={ripple.x} y={ripple.y} />
                    ))}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Country selection */}
        {step === 'country' && (
          <motion.div
            key="country"
            className={styles.centeredStep}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h1 className={styles.pageTitle} variants={itemVariants}>
              Выберите страну
            </motion.h1>
            <motion.p className={styles.stepSubtitle} variants={itemVariants}>
              {selectedDept?.label}
            </motion.p>
            
            <motion.div className={styles.optionsGrid} variants={contentVariants}>
              {countries.map((c) => (
                <motion.button
                  key={c.id}
                  className={styles.optionButton}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -4,
                    transition: spring.light,
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCountrySelect(c.id)}
                >
                  {c.label}
                </motion.button>
              ))}
            </motion.div>
            
            <motion.button 
              className={styles.backButton} 
              onClick={handleBack}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Назад
            </motion.button>
          </motion.div>
        )}

        {/* Step 3: City selection */}
        {step === 'city' && country && (
          <motion.div
            key="city"
            className={styles.centeredStep}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h1 className={styles.pageTitle} variants={itemVariants}>
              Выберите город
            </motion.h1>
            <motion.p className={styles.stepSubtitle} variants={itemVariants}>
              {selectedDept?.label} · {countries.find((c) => c.id === country)?.label}
            </motion.p>
            
            <motion.div className={styles.optionsGrid} variants={contentVariants}>
              {citiesByCountry[country].map((c) => (
                <motion.button
                  key={c}
                  className={styles.optionButton}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -4,
                    transition: spring.light,
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCitySelect(c)}
                >
                  {c}
                </motion.button>
              ))}
            </motion.div>
            
            <motion.button 
              className={styles.backButton} 
              onClick={handleBack}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Назад
            </motion.button>
          </motion.div>
        )}

        {/* Step 4: Contacts - Compact layout */}
        {step === 'contacts' && (
          <motion.div
            key="contacts"
            className={styles.centeredStep}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h1 className={`${styles.pageTitle} ${styles.pageTitleCompact}`} variants={itemVariants}>
              Контакты
            </motion.h1>

            <motion.div className={styles.contactsCard} variants={contentVariants}>
              <motion.p className={styles.contactsLabel} variants={itemVariants}>
                {selectedDept?.label}
                {city && country && ` · ${city}`}
              </motion.p>
              
              <motion.a 
                href={`tel:${getPhone().replace(/\s/g, '')}`} 
                className={styles.phoneNumber}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async (e) => {
                  const phoneNumber = getPhone().replace(/\s/g, '')
                  const platformInfo = detectPlatform()
                  
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
                      // ignore
                    }
                  }
                  
                  if (platformInfo.isMobile) {
                    await copyPhoneWithNotification()
                    return
                  }
                  
                  e.preventDefault()
                  try {
                    const telLink = document.createElement('a')
                    telLink.href = `tel:${phoneNumber}`
                    telLink.style.display = 'none'
                    document.body.appendChild(telLink)
                    telLink.click()
                    document.body.removeChild(telLink)
                    setTimeout(copyPhoneWithNotification, 100)
                  } catch {
                    await copyPhoneWithNotification()
                  }
                }}
              >
                {getPhone()}
              </motion.a>
              
              {getEmail() && (
                <motion.a 
                  href={`mailto:${getEmail()}`} 
                  className={styles.emailLink}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  {getEmail()}
                </motion.a>
              )}
              
              <motion.p className={styles.workHours} variants={itemVariants}>
                Ежедневно с 8:00 до 22:00
              </motion.p>
              
              <motion.div className={styles.socialLinks} variants={itemVariants}>
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
              </motion.div>
            </motion.div>
            
            <motion.button 
              className={styles.resetButton} 
              onClick={handleReset}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Выбрать другой отдел
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
