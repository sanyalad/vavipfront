import apiClient from './client'
import { Contact, CountryContacts } from '@/types'

interface Country {
  country: string
  country_code: string | null
  map_image_url: string | null
}

export const contactsApi = {
  getContacts: async (): Promise<CountryContacts[]> => {
    const response = await apiClient.get<CountryContacts[]>('/contacts')
    return response.data
  },

  getCountries: async (): Promise<Country[]> => {
    const response = await apiClient.get<Country[]>('/contacts/countries')
    return response.data
  },

  getContactsByCountry: async (countryCode: string): Promise<Contact[]> => {
    const response = await apiClient.get<Contact[]>(`/contacts/country/${countryCode}`)
    return response.data
  },

  getContactByCity: async (city: string): Promise<Contact> => {
    const response = await apiClient.get<Contact>(`/contacts/city/${city}`)
    return response.data
  },

  // Admin operations
  createContact: async (data: Partial<Contact>): Promise<Contact> => {
    const response = await apiClient.post<Contact>('/contacts', data)
    return response.data
  },

  updateContact: async (id: number, data: Partial<Contact>): Promise<Contact> => {
    const response = await apiClient.put<Contact>(`/contacts/${id}`, data)
    return response.data
  },

  deleteContact: async (id: number): Promise<void> => {
    await apiClient.delete(`/contacts/${id}`)
  },
}











