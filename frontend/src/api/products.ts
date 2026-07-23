import api from './client'
import type { ApiResponse, Product, PaginationMeta } from '../types'

export interface ProductParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  ativo?: boolean
  estoqueMinimo?: boolean
}

export interface CreateProductData {
  nome: string
  sku?: string
  descricao?: string
  preco: number
  precoCusto?: number
  estoque?: number
  estoqueMinimo?: number
  codigoBarras?: string
  unidade?: string
  categoryId?: string
}

export type UpdateProductData = Partial<CreateProductData> & { ativo?: boolean }

// HTTP response shape for paginated endpoints (backend spreads { data, meta } flat)
type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const productsApi = {
  findAll: async (params?: ProductParams) => {
    const res = await api.get<PageRes<Product>>('/api/v1/products', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  findById: async (id: string) => {
    const res = await api.get<ApiResponse<{ product: Product }>>(`/api/v1/products/${id}`)
    return res.data.data.product
  },

  create: async (data: CreateProductData) => {
    const res = await api.post<ApiResponse<{ product: Product }>>('/api/v1/products', data)
    return res.data.data.product
  },

  update: async (id: string, data: UpdateProductData) => {
    const res = await api.put<ApiResponse<{ product: Product }>>(`/api/v1/products/${id}`, data)
    return res.data.data.product
  },

  remove: async (id: string) => {
    await api.delete(`/api/v1/products/${id}`)
  },

  uploadImage: async (id: string, file: File) => {
    const form = new FormData()
    form.append('imagem', file)
    const res = await api.post<ApiResponse<{ imagemUrl: string }>>(`/api/v1/products/${id}/imagem`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
}

export const { findAll, findById, create, update, remove, uploadImage } = productsApi
