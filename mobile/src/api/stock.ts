import api from './client'
import type { ApiResponse, PaginatedResponse, StockMovement, MovementType } from '../types'

interface FindAllParams {
  page?: number
  limit?: number
  productId?: string
  tipo?: MovementType
}

interface CreateMovementData {
  productId: string
  tipo: MovementType
  quantidade: number
  motivo?: string
}

export const stockApi = {
  findAll: async (params?: FindAllParams) => {
    const res = await api.get<ApiResponse<PaginatedResponse<StockMovement>>>('/api/v1/stock', { params })
    return res.data.data
  },

  create: async (data: CreateMovementData) => {
    const res = await api.post<ApiResponse<StockMovement>>('/api/v1/stock', data)
    return res.data.data
  },
}
