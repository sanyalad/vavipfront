import apiClient from './client'
import { AuthResponse, LoginRequest, RegisterRequest, RefreshResponse } from '@/types'
import { User } from '@/types'

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh')
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>('/auth/me', data)
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}


