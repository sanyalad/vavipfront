export const phoneNumber = '+7 (931) 248-70-13'

export const phoneNumberClean = phoneNumber.replace(/\s|\(|\)|-/g, '')

export const workingHours = 'Каждый день с 8:00 до 22:00'

export interface SocialLink {
  name: string
  url: string
}

export const socialLinks: SocialLink[] = [
  { name: 'telegram', url: 'https://t.me/karen_vavip' },
  { name: 'instagram', url: 'https://instagram.com/karen_vavip' },
  { name: 'vk', url: 'https://vk.com/karen_vavip' },
  { name: 'pinterest', url: 'https://pinterest.com/karen_vavip' },
  { name: 'youtube', url: 'https://youtube.com/@karenvavip' },
]

