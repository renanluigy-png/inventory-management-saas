import api from './client'
import type { ApiResponse, User, Role, PaginationMeta } from '../types'

export interface UserParams { page?: number; limit?: number; search?: string; role?: Role; ativo?: boolean }
export interface CreateUserData { nome: string; email: string; senha: string; role: Role }
export interface UpdateUserData { nome?: string; email?: string; role?: Role; ativo?: boolean }
export interface ChangePasswordData { senhaAtual?: string; novaSenha: string }

// HTTP response shape for paginated endpoints (backend spreads { data, meta } flat)
type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const usersApi = {
  findAll: async (params?: UserParams) => {
    const res = await api.get<PageRes<User>>('/api/v1/users', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
  create: async (data: CreateUserData) => {
    const res = await api.post<ApiResponse<{ user: User }>>('/api/v1/users', data)
    return res.data.data.user
  },
  update: async (id: string, data: UpdateUserData) => {
    const res = await api.put<ApiResponse<{ user: User }>>(`/api/v1/users/${id}`, data)
    return res.data.data.user
  },
  changePassword: async (id: string, data: ChangePasswordData) => {
    await api.patch(`/api/v1/users/${id}/password`, data)
  },
  remove: async (id: string) => {
    await api.delete(`/api/v1/users/${id}`)
  },
}

export const { findAll, create, update, remove, changePassword } = usersApi
