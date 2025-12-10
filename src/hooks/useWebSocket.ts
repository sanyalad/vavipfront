import { useEffect, useCallback } from 'react'
import websocketService from '@/services/websocket'
import { useAuthStore } from '@/store/authStore'

export function useWebSocket() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect()
    }

    return () => {
      websocketService.disconnect()
    }
  }, [isAuthenticated])

  const subscribe = useCallback((event: string, callback: (data: unknown) => void) => {
    websocketService.on(event, callback)
    return () => websocketService.off(event, callback)
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    websocketService.emit(event, data)
  }, [])

  const subscribeToOrder = useCallback((orderId: number) => {
    websocketService.subscribeToOrder(orderId)
    return () => websocketService.unsubscribeFromOrder(orderId)
  }, [])

  return {
    subscribe,
    emit,
    subscribeToOrder,
    isConnected: websocketService.isConnected,
  }
}

// Hook for order status updates
export function useOrderUpdates(orderId: number, onUpdate: (data: unknown) => void) {
  const { subscribe, subscribeToOrder } = useWebSocket()

  useEffect(() => {
    const unsubscribe = subscribeToOrder(orderId)
    const unsubscribeEvent = subscribe('order_update', onUpdate)

    return () => {
      unsubscribe()
      unsubscribeEvent()
    }
  }, [orderId, onUpdate, subscribe, subscribeToOrder])
}

// Hook for real-time notifications
export function useNotifications(onNotification: (data: unknown) => void) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const events = ['order_created', 'order_status_changed', 'new_feedback']
    const unsubscribes = events.map(event => subscribe(event, onNotification))

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [onNotification, subscribe])
}


