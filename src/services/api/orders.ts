import apiClient from './client'
import { Order, CreateOrderRequest, UpdateOrderStatusRequest, CreateOrderResponse } from '@/types'

export const ordersApi = {
  getOrders: async (all?: boolean): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', { 
      params: all ? { all: 'true' } : {} 
    })
    return response.data
  },

  getOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`)
    return response.data
  },

  createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    const response = await apiClient.post<CreateOrderResponse>('/orders', data)
    return response.data
  },

  updateOrderStatus: async (id: number, data: UpdateOrderStatusRequest): Promise<Order> => {
    const response = await apiClient.put<Order>(`/orders/${id}/status`, data)
    return response.data
  },

  cancelOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${id}/cancel`)
    return response.data
  },

  repeatOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${id}/repeat`)
    return response.data
  },
}






