import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { authApi, handleApiError } from '@/services/api'
import { LoginRequest, RegisterRequest } from '@/types'
import { useUIStore } from '@/store/uiStore'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    login: setLogin, 
    logout: setLogout,
    setUser,
    setLoading,
  } = useAuthStore()

  // Fetch current user on mount if we have a token
  const { refetch: fetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: false,
    retry: false,
  })

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = useAuthStore.getState().accessToken
      if (token) {
        try {
          const { data } = await fetchUser()
          if (data) {
            setUser(data)
          }
        } catch {
          setLogout()
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [fetchUser, setUser, setLogout, setLoading])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setLogin(data.user, data.access_token, data.refresh_token)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      addToast({ type: 'success', message: 'Добро пожаловать!' })
      navigate('/')
    },
    onError: (error) => {
      addToast({ type: 'error', message: handleApiError(error) })
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setLogin(data.user, data.access_token, data.refresh_token)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      addToast({ type: 'success', message: 'Регистрация успешна!' })
      navigate('/')
    },
    onError: (error) => {
      addToast({ type: 'error', message: handleApiError(error) })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setLogout()
      queryClient.clear()
      addToast({ type: 'info', message: 'Вы вышли из аккаунта' })
      navigate('/')
    },
    onError: () => {
      // Logout locally even if API fails
      setLogout()
      queryClient.clear()
      navigate('/')
    },
  })

  const login = (data: LoginRequest) => loginMutation.mutate(data)
  const register = (data: RegisterRequest) => registerMutation.mutate(data)
  const logout = () => logoutMutation.mutate()

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin' || user?.role === 'manager',
    login,
    register,
    logout,
    loginLoading: loginMutation.isPending,
    registerLoading: registerMutation.isPending,
  }
}












