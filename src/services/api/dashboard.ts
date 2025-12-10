import apiClient from './client'
import { DashboardStats, SalesChartData, TopProduct, Order, User } from '@/types'

interface UsersResponse {
  users: User[]
  total: number
  pages: number
  current_page: number
}

export const dashboardApi = {
  getStats: async (days?: number): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats', {
      params: days ? { days } : {},
    })
    return response.data
  },

  getSalesChart: async (days?: number): Promise<SalesChartData[]> => {
    const response = await apiClient.get<SalesChartData[]>('/dashboard/sales-chart', {
      params: days ? { days } : {},
    })
    return response.data
  },

  getTopProducts: async (limit?: number, days?: number): Promise<TopProduct[]> => {
    const response = await apiClient.get<TopProduct[]>('/dashboard/top-products', {
      params: { limit, days },
    })
    return response.data
  },

  getRecentOrders: async (limit?: number): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/dashboard/recent-orders', {
      params: limit ? { limit } : {},
    })
    return response.data
  },

  getOrderStatusBreakdown: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get<Record<string, number>>('/dashboard/order-status-breakdown')
    return response.data
  },

  getUsers: async (params?: {
    page?: number
    per_page?: number
    search?: string
    role?: string
  }): Promise<UsersResponse> => {
    const response = await apiClient.get<UsersResponse>('/dashboard/users', { params })
    return response.data
  },

  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/dashboard/users/${id}`, data)
    return response.data
  },
}


