import api from './client'
import type { ApiResponse, LoginResponse, User } from '../types'

export interface LoginCredentials {
  email: string
  senha: string
}

export interface RegisterCompanyData {
  nomeEmpresa: string
  nomeFantasia?: string
  cnpj?: string
  telefoneEmpresa?: string
  nomeAdmin: string
  email: string
  senha: string
  confirmarSenha: string
  cidade?: string
  estado?: string
}

export const authApi = {
  login: async (data: LoginCredentials) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', data)
    return res.data.data
  },

  refresh: async (refreshToken: string) => {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>(
      '/api/v1/auth/refresh',
      { refreshToken }
    )
    return res.data.data
  },

  logout: async (refreshToken?: string) => {
    await api.post('/api/v1/auth/logout', { refreshToken })
  },

  forgotPassword: async (email: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/api/v1/auth/forgot-password', { email })
    return res.data
  },

  resetPassword: async (token: string, novaSenha: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/api/v1/auth/reset-password', {
      token,
      novaSenha,
    })
    return res.data
  },

  changePassword: async (senhaAtual: string, novaSenha: string) => {
    const res = await api.put<ApiResponse<{ message: string }>>('/api/v1/auth/change-password', {
      senhaAtual,
      novaSenha,
    })
    return res.data
  },

  me: async () => {
    const res = await api.get<ApiResponse<{ user: User }>>('/api/v1/auth/me')
    return res.data.data.user
  },

  registerCompany: async (data: RegisterCompanyData) => {
    const res = await api.post<ApiResponse<LoginResponse & { company: { id: string; nome: string; nomeFantasia: string | null } }>>('/api/v1/auth/register-company', data)
    return res.data.data
  },
}

export const login = (email: string, senha: string) => authApi.login({ email, senha })
export const me = () => authApi.me()
export const registerCompany = (data: RegisterCompanyData) => authApi.registerCompany(data)
