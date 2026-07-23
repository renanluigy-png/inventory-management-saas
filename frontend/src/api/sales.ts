import api from './client'
import type { ApiResponse, Sale, FormaPagamento, StatusVenda, PaginationMeta } from '../types'

export interface SaleParams { page?: number; limit?: number; status?: StatusVenda; customerId?: string; dataInicio?: string; dataFim?: string }
export interface CreateSaleData { customerId?: string; observacao?: string }
export interface AddItemData { productId?: string; codigoBarras?: string; sku?: string; quantidade: number; desconto?: number }
export interface UpdateItemData { quantidade?: number; desconto?: number }
export interface UpdateSaleData { customerId?: string; desconto?: number; formaPagamento?: FormaPagamento; observacao?: string }

// HTTP response shape for paginated endpoints (backend spreads { data, meta } flat)
type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const salesApi = {
  findAll: async (params?: SaleParams) => {
    const res = await api.get<PageRes<Sale>>('/api/v1/sales', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
  findById: async (id: string) => {
    const res = await api.get<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${id}`)
    return res.data.data.sale
  },
  create: async (data?: CreateSaleData) => {
    const res = await api.post<ApiResponse<{ sale: Sale }>>('/api/v1/sales', data ?? {})
    return res.data.data.sale
  },
  update: async (id: string, data: UpdateSaleData) => {
    const res = await api.patch<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${id}`, data)
    return res.data.data.sale
  },
  addItem: async (id: string, data: AddItemData) => {
    const res = await api.post<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${id}/items`, data)
    return res.data.data.sale
  },
  updateItem: async (saleId: string, itemId: string, data: UpdateItemData) => {
    const res = await api.patch<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${saleId}/items/${itemId}`, data)
    return res.data.data.sale
  },
  removeItem: async (saleId: string, itemId: string) => {
    const res = await api.delete<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${saleId}/items/${itemId}`)
    return res.data.data.sale
  },
  finalize: async (id: string, formaPagamento: FormaPagamento) => {
    await api.patch(`/api/v1/sales/${id}`, { formaPagamento })
    const res = await api.post<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${id}/finalize`)
    return res.data.data.sale
  },
  cancel: async (id: string, observacao?: string) => {
    const res = await api.post<ApiResponse<{ sale: Sale }>>(`/api/v1/sales/${id}/cancel`, { observacao })
    return res.data.data.sale
  },
}

export const { findAll, findById, create, update, addItem, updateItem, removeItem, finalize, cancel } = salesApi
