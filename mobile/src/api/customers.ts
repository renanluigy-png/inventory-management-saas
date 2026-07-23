import api from './client'
import type { ApiResponse, PaginatedResponse, Customer, Sale } from '../types'

interface FindAllParams {
  page?: number
  limit?: number
  search?: string
}

interface CreateCustomerData {
  nome: string
  email?: string
  cpf?: string
  telefone?: string
  endereco?: string
}

export const customersApi = {
  findAll: async (params?: FindAllParams) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Customer>>>('/api/v1/customers', { params })
    return res.data.data
  },

  findById: async (id: string) => {
    const res = await api.get<ApiResponse<Customer>>(`/api/v1/customers/${id}`)
    return res.data.data
  },

  getSales: async (id: string) => {
    const res = await api.get<ApiResponse<{ data: Sale[] }>>(`/api/v1/customers/${id}/sales`)
    return res.data.data.data ?? (res.data.data as unknown as Sale[])
  },

  create: async (data: CreateCustomerData) => {
    const res = await api.post<ApiResponse<Customer>>('/api/v1/customers', data)
    return res.data.data
  },

  update: async (id: string, data: Partial<CreateCustomerData>) => {
    const res = await api.put<ApiResponse<Customer>>(`/api/v1/customers/${id}`, data)
    return res.data.data
  },

  remove: async (id: string) => {
    await api.delete(`/api/v1/customers/${id}`)
  },
}
