import api from './client'
import type { ApiResponse, SystemSettings } from '../types'

export interface UpdateSettingsData {
  nomeEmpresa?: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  logoUrl?: string
  tema?: 'light' | 'dark'
  moeda?: string
  impostoPercent?: number
  estoqueMinimoPadrao?: number
  permitirVendaSemEstoque?: boolean
}

export const settingsApi = {
  get: async () => {
    const res = await api.get<ApiResponse<SystemSettings>>('/api/v1/settings')
    return res.data.data
  },
  update: async (data: UpdateSettingsData) => {
    const res = await api.put<ApiResponse<SystemSettings>>('/api/v1/settings', data)
    return res.data.data
  },
}

export const { get, update } = settingsApi
