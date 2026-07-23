import api from './client'
import type { ApiResponse, StockMovement, TipoMovimentacao, PaginationMeta } from '../types'

export interface StockParams {
  page?: number
  limit?: number
  productId?: string
  tipo?: TipoMovimentacao
  dataInicio?: string
  dataFim?: string
}

export interface CreateMovementData {
  productId: string
  tipo: TipoMovimentacao
  quantidade: number
  motivo?: string
}

type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const stockApi = {
  // GET /stock/history — histórico de movimentações (não /stock que retorna níveis por produto)
  findAll: async (params?: StockParams) => {
    const res = await api.get<PageRes<StockMovement>>('/api/v1/stock/history', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  // Roteia para o endpoint correto por tipo — POST /stock não existe no backend
  create: async (data: CreateMovementData) => {
    const { productId, tipo, quantidade, motivo } = data
    if (tipo === 'ENTRADA') {
      const res = await api.post<ApiResponse<{ movimentacao: StockMovement }>>('/api/v1/stock/entry', { productId, quantidade, motivo })
      return res.data.data.movimentacao
    }
    if (tipo === 'SAIDA') {
      const res = await api.post<ApiResponse<{ movimentacao: StockMovement }>>('/api/v1/stock/output', { productId, quantidade, motivo })
      return res.data.data.movimentacao
    }
    // AJUSTE: backend espera novoEstoque (estoque absoluto), não quantidade relativa
    const res = await api.post<ApiResponse<{ estoqueAnterior: number; estoqueAtual: number; movimentacao: StockMovement }>>('/api/v1/stock/adjust', { productId, novoEstoque: quantidade, motivo })
    return res.data.data.movimentacao
  },
}

export const { findAll, create } = stockApi
