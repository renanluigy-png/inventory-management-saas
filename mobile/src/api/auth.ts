import api from './client'
import type { ApiResponse, LoginResponse, AuthUser } from '../types'

export const authApi = {
  login: async (email: string, senha: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', { email, senha })
    return res.data.data
  },

  me: async () => {
    const res = await api.get<ApiResponse<{ user: AuthUser }>>('/api/v1/auth/me')
    return res.data.data.user
  },

  changePassword: async (senhaAtual: string, novaSenha: string) => {
    const res = await api.put('/api/v1/auth/change-password', { senhaAtual, novaSenha })
    return res.data
  },
}
