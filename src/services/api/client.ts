import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = useAuthStore.getState().refreshToken
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          })
          
          const { access_token } = response.data
          useAuthStore.getState().setTokens(access_token, refreshToken)
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      } else {
        useAuthStore.getState().logout()
      }
    }
    
    return Promise.reject(error)
  }
)

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export default apiClient


