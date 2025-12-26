import { detectPlatform } from './platform'

export interface CopyPhoneOptions {
  phoneNumber: string
  phoneNumberClean: string
  onSuccess?: (message: string) => void
}

/**
 * Copies phone number to clipboard with fallback for older browsers
 */
async function copyPhoneToClipboard(phoneNumber: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(phoneNumber)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = phoneNumber
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  } catch (error) {
    // Silently fail - user will see error if needed
    throw error
  }
}

/**
 * Handles phone number click event
 * On mobile: copies to clipboard
 * On desktop: attempts to open tel: link and copies to clipboard
 */
export async function handlePhoneClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  options: CopyPhoneOptions
): Promise<void> {
  const { phoneNumber, phoneNumberClean, onSuccess } = options
  const platformInfo = detectPlatform()

  const copyPhoneWithNotification = async () => {
    try {
      await copyPhoneToClipboard(phoneNumber)
      onSuccess?.('Номер скопирован в буфер обмена')
    } catch {
      // Ignore errors - user can manually copy if needed
    }
  }

  // On mobile, just copy to clipboard
  if (platformInfo.isMobile) {
    await copyPhoneWithNotification()
    return
  }

  // On desktop, try to open tel: link and copy
  e.preventDefault()
  try {
    const telLink = document.createElement('a')
    telLink.href = `tel:${phoneNumberClean}`
    telLink.style.display = 'none'
    document.body.appendChild(telLink)
    telLink.click()
    document.body.removeChild(telLink)
    // Small delay to ensure tel: link is processed
    setTimeout(copyPhoneWithNotification, 100)
  } catch {
    // Fallback to just copying
    await copyPhoneWithNotification()
  }
}

