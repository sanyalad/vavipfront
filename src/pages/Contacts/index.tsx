import { useState, useRef, useCallback, useEffect } from 'react'
import { AuroraBackground } from '@/components/animations/AuroraBackground'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { FeedbackForm } from '@/components/FeedbackForm'
import Footer from '@/components/layout/Footer'
import { useGSAPPageTransition } from '@/hooks/useGSAPPageTransition'
import { useFooterDrawer } from '@/hooks/useFooterDrawer'
import { handlePhoneClick as handlePhoneClickUtil } from '@/utils/phone'
import { useUIStore } from '@/store/uiStore'
import { phoneNumber, phoneNumberClean, workingHours, socialLinks } from '@/config/contacts'
import styles from './Contacts.module.css'

export default function ContactsPage() {
  const { addToast } = useUIStore()
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  // Footer drawer management
  const { isFooterOpen, closeFooter } = useFooterDrawer()

  // GSAP Page Transition
  useGSAPPageTransition(pageRef, {
    duration: 0.3,
    ease: 'power1.out',
    fromOpacity: 0,
    toOpacity: 1,
  })

  // Disable scroll like on home page
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])

  // Handle phone click
  const handlePhoneClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      await handlePhoneClickUtil(e, {
        phoneNumber,
        phoneNumberClean,
        onSuccess: (message) => addToast({ type: 'success', message }),
      })
    },
    [addToast]
  )

  return (
    <div ref={pageRef} className={styles.contactsPage}>
      {/* Aurora Background */}
      <AuroraBackground />

      {/* Page Title */}
      <h1 className={styles.pageTitle}>Контакты</h1>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.twoColumnLayout}>
          {/* Left Block - Contacts */}
          <div className={styles.leftBlock}>
            <div className={styles.contentWrapper}>
              <a
                href={`tel:${phoneNumberClean}`}
                onClick={handlePhoneClick}
                className={styles.phoneNumber}
              >
                {phoneNumber}
              </a>

              <p className={styles.blockDescription}>{workingHours}</p>

              <div className={styles.actions}>
                <MagneticButton
                  variant="pill"
                  size="default"
                  onClick={() => setContactModalOpen(true)}
                >
                  Обратная связь
                </MagneticButton>

                <div className={styles.socialIcons}>
                  {socialLinks.map(({ name, url }) => (
                    <a
                      key={name}
                      href={url}
                      className={styles.socialIcon}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                    >
                      <img src={`/images/icons/${name}.svg`} alt={name} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Block - Offices */}
          <div className={styles.rightBlock}>
            <div className={styles.contentWrapper}>
              <a
                href="#"
                className={styles.phoneNumber}
                onClick={(e) => e.preventDefault()}
              >
                Санкт-Петербург, ул. Примерная, д. 1
              </a>

              <p className={styles.blockDescription}>
                Посетите наши офисы для личной консультации и оформления заказа
              </p>

              <div className={styles.actions}>
                <MagneticButton variant="pill-outline" size="default">
                  Все офисы
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Overlay */}
      <Footer onClose={closeFooter} isOpen={isFooterOpen} />

      {/* Contact Modal */}
      <FeedbackForm
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  )
}
