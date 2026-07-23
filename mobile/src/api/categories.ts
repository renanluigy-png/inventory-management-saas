import api from './client'
import type { ApiResponse, Category } from '../types'

export const categoriesApi = {
  findAll: async () => {
    const res = await api.get<ApiResponse<{ data: Category[] }>>('/api/v1/categories')
    return res.data.data.data ?? (res.data.data as unknown as Category[])
  },
}
