import api from './client'
import type { ApiResponse } from '../types'

export const systemApi = {
  checkSetup: async () => {
    const res = await api.get<ApiResponse<{ configured: boolean; userCount: number }>>('/api/v1/system/check-setup')
    return res.data.data
  },

  loadDemoData: async () => {
    const res = await api.post<ApiResponse<{ categorias: number; produtos: number; clientes: number; vendas: number }>>('/api/v1/system/demo-data')
    return res.data
  },
}

export const { checkSetup, loadDemoData } = systemApi
