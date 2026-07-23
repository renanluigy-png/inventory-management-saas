import api from './client'
import type { ApiResponse, Customer, PaginationMeta } from '../types'

export interface CustomerParams { page?: number; limit?: number; search?: string; ativo?: boolean }
export interface CustomerData { nome: string; cpf?: string; email?: string; telefone?: string; endereco?: string }

// HTTP response shape for paginated endpoints (backend spreads { data, meta } flat)
type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const customersApi = {
  findAll: async (params?: CustomerParams) => {
    const res = await api.get<PageRes<Customer>>('/api/v1/customers', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
  findById: async (id: string) => {
    const res = await api.get<ApiResponse<{ customer: Customer }>>(`/api/v1/customers/${id}`)
    return res.data.data.customer
  },
  create: async (data: CustomerData) => {
    const res = await api.post<ApiResponse<{ customer: Customer }>>('/api/v1/customers', data)
    return res.data.data.customer
  },
  update: async (id: string, data: Partial<CustomerData> & { ativo?: boolean }) => {
    const res = await api.put<ApiResponse<{ customer: Customer }>>(`/api/v1/customers/${id}`, data)
    return res.data.data.customer
  },
  remove: async (id: string) => {
    await api.delete(`/api/v1/customers/${id}`)
  },
}

export const { findAll, findById, create, update, remove } = customersApi
