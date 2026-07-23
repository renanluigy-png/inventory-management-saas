import api from './client'
import type { ApiResponse } from '../types'

export interface Notification {
  id: string
  userId: string | null
  titulo: string
  mensagem: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  lida: boolean
  link: string | null
  createdAt: string
}

export interface NotificationsResponse {
  data: Notification[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    naoLidas: number
  }
}

export const notificationsApi = {
  findAll: async (params?: { page?: number; limit?: number; naoLidas?: boolean }) => {
    const res = await api.get<ApiResponse<never> & NotificationsResponse>('/api/v1/notifications', {
      params,
    })
    return res.data as unknown as NotificationsResponse
  },

  markAsRead: async (id: string) => {
    const res = await api.patch<ApiResponse<{ notification: Notification }>>(
      `/api/v1/notifications/${id}/read`
    )
    return res.data.data.notification
  },

  markAllAsRead: async () => {
    await api.patch('/api/v1/notifications/read-all')
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/notifications/${id}`)
  },
}
