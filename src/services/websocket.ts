import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

const WS_URL = import.meta.env.VITE_WS_URL || ''

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map()

  connect(): void {
    if (this.socket?.connected) return

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.authenticate()
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    // Re-emit events to listeners
    this.socket.onAny((event, data) => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.forEach(callback => callback(data))
      }
    })
  }

  private authenticate(): void {
    const token = useAuthStore.getState().accessToken
    if (token && this.socket) {
      this.socket.emit('authenticate', { token })
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: unknown) => void): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
    }
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  subscribeToOrder(orderId: number): void {
    this.emit('subscribe_order', { order_id: orderId })
  }

  unsubscribeFromOrder(orderId: number): void {
    this.emit('unsubscribe_order', { order_id: orderId })
  }

  joinRoom(room: string): void {
    this.emit('join_room', { room })
  }

  leaveRoom(room: string): void {
    this.emit('leave_room', { room })
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const websocketService = new WebSocketService()
export default websocketService









