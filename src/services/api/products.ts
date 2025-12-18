import apiClient from './client'
import { Product, Category, ProductsResponse, ProductFilters } from '@/types'

export const productsApi = {
  getProducts: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const response = await apiClient.get<ProductsResponse>('/products', { params: filters })
    return response.data
  },

  getProduct: async (slug: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${slug}`)
    return response.data
  },

  getProductById: async (id: number): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`)
    return response.data
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products/featured')
    return response.data
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/products/categories')
    return response.data
  },

  getCategory: async (slug: string): Promise<Category> => {
    const response = await apiClient.get<Category>(`/products/categories/${slug}`)
    return response.data
  },

  // Favorites
  addToFavorites: async (productId: number): Promise<void> => {
    await apiClient.post(`/products/${productId}/favorite`)
  },

  removeFromFavorites: async (productId: number): Promise<void> => {
    await apiClient.delete(`/products/${productId}/favorite`)
  },

  getFavorites: async (): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products/favorites')
    return response.data
  },

  // Admin operations
  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<Product>('/products', data)
    return response.data
  },

  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.put<Product>(`/products/${id}`, data)
    return response.data
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/products/${id}`)
  },
}









