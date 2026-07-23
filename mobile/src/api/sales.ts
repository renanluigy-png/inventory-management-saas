import api from './client'
import type { ApiResponse, PaginatedResponse, Sale, FormaPagamento } from '../types'

interface FindAllParams {
  page?: number
  limit?: number
  status?: string
  dataInicio?: string
  dataFim?: string
}

export const salesApi = {
  findAll: async (params?: FindAllParams) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Sale>>>('/api/v1/sales', { params })
    return res.data.data
  },

  findById: async (id: string) => {
    const res = await api.get<ApiResponse<Sale>>(`/api/v1/sales/${id}`)
    return res.data.data
  },

  create: async (customerId?: string) => {
    const res = await api.post<ApiResponse<Sale>>('/api/v1/sales', { customerId })
    return res.data.data
  },

  addItem: async (saleId: string, data: { productId: string; quantidade: number }) => {
    const res = await api.post<ApiResponse<Sale>>(`/api/v1/sales/${saleId}/items`, data)
    return res.data.data
  },

  updateItem: async (saleId: string, itemId: string, data: { quantidade: number }) => {
    const res = await api.put<ApiResponse<Sale>>(`/api/v1/sales/${saleId}/items/${itemId}`, data)
    return res.data.data
  },

  removeItem: async (saleId: string, itemId: string) => {
    const res = await api.delete<ApiResponse<Sale>>(`/api/v1/sales/${saleId}/items/${itemId}`)
    return res.data.data
  },

  finalize: async (saleId: string, formaPagamento: FormaPagamento, desconto?: number) => {
    const res = await api.put<ApiResponse<Sale>>(`/api/v1/sales/${saleId}/finalize`, {
      formaPagamento,
      desconto,
    })
    return res.data.data
  },

  cancel: async (saleId: string) => {
    const res = await api.put<ApiResponse<Sale>>(`/api/v1/sales/${saleId}/cancel`)
    return res.data.data
  },
}
