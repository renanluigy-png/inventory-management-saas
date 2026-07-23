import api from './client'
import type { ApiResponse, Category, PaginationMeta } from '../types'

export interface CategoryParams { page?: number; limit?: number; search?: string; ativo?: boolean }
export interface CategoryData { nome: string; descricao?: string }

// HTTP response shape for paginated endpoints (backend spreads { data, meta } flat)
type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const categoriesApi = {
  findAll: async (params?: CategoryParams) => {
    const res = await api.get<PageRes<Category>>('/api/v1/categories', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
  findAllSimple: async (): Promise<Category[]> => {
    const res = await api.get<PageRes<Category>>('/api/v1/categories', { params: { limit: 100, ativo: true } })
    return res.data.data
  },
  create: async (data: CategoryData) => {
    const res = await api.post<ApiResponse<{ category: Category }>>('/api/v1/categories', data)
    return res.data.data.category
  },
  update: async (id: string, data: Partial<CategoryData> & { ativo?: boolean }) => {
    const res = await api.put<ApiResponse<{ category: Category }>>(`/api/v1/categories/${id}`, data)
    return res.data.data.category
  },
  remove: async (id: string) => {
    await api.delete(`/api/v1/categories/${id}`)
  },
}

export const { findAll, findAllSimple, create, update, remove } = categoriesApi
