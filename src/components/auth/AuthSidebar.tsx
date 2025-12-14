import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { authApi, handleApiError } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import styles from './AuthSidebar.module.css'

export default function AuthSidebar() {
  const {
    isAuthDrawerOpen,
    authDrawerMode,
    closeAuthDrawer,
    openAuthDrawer,
    addToast,
  } = useUIStore()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null)
  const [resendLeft, setResendLeft] = useState(0)
  const [isBusy, setIsBusy] = useState(false)
  const otpAutoSubmitArmedRef = useRef(true)

  // Reset OTP state when switching modes
  useEffect(() => {
    setOtpSent(false)
    setOtpCode('')
    setDevOtpCode(null)
    setResendLeft(0)
    otpAutoSubmitArmedRef.current = true
  }, [authDrawerMode])

  const title = useMemo(() => (authDrawerMode === 'register' ? 'Регистрация' : 'Вход'), [authDrawerMode])
  const hint = useMemo(() => {
    if (authDrawerMode === 'login') return 'Введите номер телефона и пароль для входа.'
    if (!otpSent) return 'Введите номер телефона — на следующем шаге появится код подтверждения.'
    return 'Введите код. Сейчас SMS не отправляем — в dev режиме код показывается прямо здесь.'
  }, [authDrawerMode, otpSent])

  const submitLabel = useMemo(() => {
    if (authDrawerMode === 'login') return 'Войти'
    return otpSent ? 'Подтвердить код' : 'Получить код'
  }, [authDrawerMode, otpSent])

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone])

  const onSubmit = async () => {
    if (!normalizedPhone || normalizedPhone.length < 10) {
      addToast({ type: 'error', message: 'Введите номер телефона', duration: 3500 })
      return
    }

    try {
      setIsBusy(true)

      if (authDrawerMode === 'login') {
        if (!password || password.length < 3) {
          addToast({ type: 'error', message: 'Введите пароль', duration: 3500 })
          return
        }

        const resp = await authApi.login({ phone: normalizedPhone, password })
        useAuthStore.getState().login(resp.user, resp.access_token, resp.refresh_token)
        addToast({ type: 'success', message: 'Добро пожаловать!' })
        closeAuthDrawer()
        return
      }

      // register via OTP (dev-mode: code is returned in response)
      if (!otpSent) {
        const resp = await authApi.otpSend({ phone: normalizedPhone })
        setOtpSent(true)
        setResendLeft(30)
        if (resp.dev_code) {
          setDevOtpCode(resp.dev_code)
          setOtpCode(resp.dev_code)
          addToast({ type: 'success', message: 'Код сгенерирован (dev режим)', duration: 3500 })
        } else {
          setDevOtpCode(null)
          addToast({ type: 'success', message: 'Код сгенерирован', duration: 3500 })
        }
        return
      }

      if (!otpCode || otpCode.replace(/\D/g, '').length < 4) {
        addToast({ type: 'error', message: 'Введите код', duration: 3500 })
        return
      }

      const resp = await authApi.otpVerify({ phone: normalizedPhone, code: otpCode.replace(/\D/g, '') })
      useAuthStore.getState().login(resp.user, resp.access_token, resp.refresh_token)
      if (resp.dev_password) {
        addToast({ type: 'info', message: `DEV пароль: ${resp.dev_password}`, duration: 6500 })
      }
      addToast({ type: 'success', message: 'Аккаунт создан и вы вошли' })
      closeAuthDrawer()
    } catch (e) {
      addToast({ type: 'error', message: handleApiError(e), duration: 4500 })
    } finally {
      setIsBusy(false)
    }
  }

  // Resend countdown
  useEffect(() => {
    if (!otpSent) return
    if (resendLeft <= 0) return
    const t = window.setInterval(() => {
      setResendLeft((v) => Math.max(0, v - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [otpSent, resendLeft])

  const resendOtp = async () => {
    if (isBusy) return
    if (resendLeft > 0) return
    if (!normalizedPhone || normalizedPhone.length < 10) return

    try {
      setIsBusy(true)
      const resp = await authApi.otpSend({ phone: normalizedPhone })
      setResendLeft(30)
      otpAutoSubmitArmedRef.current = true
      if (resp.dev_code) {
        setDevOtpCode(resp.dev_code)
        setOtpCode(resp.dev_code)
        addToast({ type: 'success', message: 'Новый код сгенерирован (dev режим)', duration: 3500 })
      } else {
        setDevOtpCode(null)
        setOtpCode('')
        addToast({ type: 'success', message: 'Новый код сгенерирован', duration: 3500 })
      }
    } catch (e) {
      addToast({ type: 'error', message: handleApiError(e), duration: 4500 })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {isAuthDrawerOpen && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAuthDrawer}
          />

          <motion.aside
            className={styles.sidebar}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            aria-label={title}
          >
            <div className={styles.header}>
              <div className={styles.headerText}>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.subtitle}>{hint}</p>
              </div>
              <button className={styles.closeButton} onClick={closeAuthDrawer} aria-label="Закрыть">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.tabs} role="tablist" aria-label="Выбор режима">
                <button
                  type="button"
                  className={`${styles.tab} ${authDrawerMode === 'login' ? styles.tabActive : ''}`}
                  onClick={() => openAuthDrawer('login')}
                >
                  Вход
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${authDrawerMode === 'register' ? styles.tabActive : ''}`}
                  onClick={() => openAuthDrawer('register')}
                >
                  Регистрация
                </button>
              </div>

              <div className={styles.form}>
                <Input
                  label="Телефон"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={authDrawerMode === 'register' && otpSent}
                />
                {authDrawerMode === 'login' && (
                  <Input
                    label="Пароль"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
                {authDrawerMode === 'register' && otpSent && (
                  <>
                    <div className={styles.note}>
                      <div className={styles.noteTitle}>Важно</div>
                      <div className={styles.noteText}>
                        Сейчас SMS не отправляем. В будущем код будет приходить на телефон.
                        {devOtpCode && (
                          <span className={styles.noteDev}>
                            DEV: код <span className={styles.noteCode}>{devOtpCode}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <Input
                      label="Код"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="______"
                      value={otpCode}
                      maxLength={6}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setOtpCode(digits)
                        if (digits.length === 6 && otpAutoSubmitArmedRef.current && !isBusy) {
                          otpAutoSubmitArmedRef.current = false
                          // tiny delay to allow state to settle
                          window.setTimeout(() => void onSubmit(), 0)
                        }
                      }}
                    />

                    <div className={styles.otpActions}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => {
                          setOtpSent(false)
                          setOtpCode('')
                          setDevOtpCode(null)
                          setResendLeft(0)
                          otpAutoSubmitArmedRef.current = true
                        }}
                        disabled={isBusy}
                      >
                        Изменить номер
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => void resendOtp()}
                        disabled={isBusy || resendLeft > 0}
                      >
                        {resendLeft > 0 ? `Отправить ещё раз через ${resendLeft}s` : 'Отправить ещё раз'}
                      </button>
                    </div>
                  </>
                )}
                <Button fullWidth onClick={onSubmit} isLoading={isBusy}>
                  {submitLabel}
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}


