import apiClient from './client'
import { Feedback, CreateFeedbackRequest, FeedbackResponse, FeedbackListResponse } from '@/types'

export const feedbackApi = {
  submitFeedback: async (data: CreateFeedbackRequest): Promise<FeedbackResponse> => {
    const response = await apiClient.post<FeedbackResponse>('/feedback', data)
    return response.data
  },

  // Admin operations
  getFeedbackList: async (params?: {
    page?: number
    per_page?: number
    status?: string
    is_read?: boolean
  }): Promise<FeedbackListResponse> => {
    const response = await apiClient.get<FeedbackListResponse>('/feedback', { params })
    return response.data
  },

  getFeedback: async (id: number): Promise<Feedback> => {
    const response = await apiClient.get<Feedback>(`/feedback/${id}`)
    return response.data
  },

  updateFeedback: async (id: number, data: Partial<Feedback>): Promise<Feedback> => {
    const response = await apiClient.put<Feedback>(`/feedback/${id}`, data)
    return response.data
  },

  deleteFeedback: async (id: number): Promise<void> => {
    await apiClient.delete(`/feedback/${id}`)
  },
}











