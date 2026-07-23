import api from './client'
import type { ApiResponse, Caixa } from '../types'

export const caixaApi = {
  getCurrent: async () => {
    try {
      const res = await api.get<ApiResponse<Caixa>>('/api/v1/caixa/current')
      return res.data.data
    } catch {
      return null
    }
  },

  open: async (saldoInicial: number) => {
    const res = await api.post<ApiResponse<Caixa>>('/api/v1/caixa/open', { saldoInicial })
    return res.data.data
  },

  close: async (id: string, saldoFinal: number) => {
    const res = await api.put<ApiResponse<Caixa>>(`/api/v1/caixa/${id}/close`, { saldoFinal })
    return res.data.data
  },

  sangria: async (id: string, valor: number, motivo?: string) => {
    const res = await api.post<ApiResponse<unknown>>(`/api/v1/caixa/${id}/sangria`, { valor, motivo })
    return res.data.data
  },

  suprimento: async (id: string, valor: number, motivo?: string) => {
    const res = await api.post<ApiResponse<unknown>>(`/api/v1/caixa/${id}/suprimento`, { valor, motivo })
    return res.data.data
  },
}
