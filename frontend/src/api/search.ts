import api from './client'
import type { ApiResponse } from '../types'

export interface SearchResult {
  query: string
  total: number
  produtos: Array<{
    id: string
    nome: string
    sku: string | null
    preco: number
    estoque: number
    imagemUrl: string | null
    category: { nome: string } | null
    _type: string
    _label: string
    _path: string
  }>
  clientes: Array<{
    id: string
    nome: string
    cpf: string | null
    email: string | null
    telefone: string | null
    _type: string
    _label: string
    _path: string
  }>
  vendas: Array<{
    id: string
    numero: number
    total: number
    status: string
    createdAt: string
    customer: { nome: string } | null
    _type: string
    _label: string
    _path: string
  }>
  categorias: Array<{
    id: string
    nome: string
    descricao: string | null
    _type: string
    _label: string
    _path: string
  }>
  promocoes: Array<{
    id: string
    nome: string
    tipo: string
    valor: number
    dataInicio: string
    dataFim: string | null
    _type: string
    _label: string
    _path: string
  }>
}

export const searchApi = {
  search: async (q: string): Promise<SearchResult> => {
    const res = await api.get<ApiResponse<SearchResult>>('/api/v1/search', { params: { q } })
    return res.data.data
  },
}
