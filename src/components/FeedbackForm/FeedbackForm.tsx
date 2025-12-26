import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { feedbackApi } from '@/services/api/feedback'
import { useUIStore } from '@/store/uiStore'
import styles from './FeedbackForm.module.css'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя').max(100, 'Имя слишком длинное'),
  phone: z.string().trim().max(20, 'Телефон слишком длинный').optional(),
  email: z.string().trim().email('Некорректный email').max(255, 'Email слишком длинный'),
  subject: z.string().trim().max(200, 'Тема слишком длинная').optional(),
  message: z.string().trim().min(1, 'Введите сообщение').max(1000, 'Сообщение слишком длинное'),
})

interface FeedbackFormProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackForm({ isOpen, onClose }: FeedbackFormProps) {
  const { addToast } = useUIStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }))
      }
    },
    [errors]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)

      try {
        const validated = contactSchema.parse(formData)
        
        await feedbackApi.submitFeedback({
          name: validated.name,
          email: validated.email,
          phone: validated.phone || undefined,
          subject: validated.subject || undefined,
          message: validated.message,
          source_page: 'contacts',
        })

        addToast({ type: 'success', message: 'Спасибо! Ваше сообщение отправлено.' })
        
        // Очистка формы
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        })
        setErrors({})

        // Закрытие формы
        setTimeout(() => {
          onClose()
        }, 500)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {}
          error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message
            }
          })
          setErrors(fieldErrors)
        } else {
          console.error('Error submitting feedback:', error)
          addToast({ type: 'error', message: 'Произошла ошибка. Попробуйте позже.' })
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, addToast, onClose]
  )

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Form Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Обратная связь</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Имя *"
                  required
                  disabled={isSubmitting}
                />
                {errors.name && <p className={styles.error}>{errors.name}</p>}
              </div>

              <div className={styles.formGroup}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Email *"
                  required
                  disabled={isSubmitting}
                />
                {errors.email && <p className={styles.error}>{errors.email}</p>}
              </div>

              <div className={styles.formGroup}>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Телефон"
                  disabled={isSubmitting}
                />
                {errors.phone && <p className={styles.error}>{errors.phone}</p>}
              </div>

              <div className={styles.formGroup}>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="Сообщение *"
                  rows={5}
                  required
                  disabled={isSubmitting}
                />
                {errors.message && <p className={styles.error}>{errors.message}</p>}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Render modal in portal to ensure it's above all content
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}

