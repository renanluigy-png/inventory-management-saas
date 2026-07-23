import api from './client'
import type { ApiResponse, PaginatedResponse, Product } from '../types'

interface FindAllParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  ativo?: boolean
}

interface CreateProductData {
  nome: string
  descricao?: string
  preco: number
  precoCusto?: number
  codigoBarras?: string
  estoque?: number
  estoqueMinimo?: number
  unidade?: string
  categoryId: string
  ativo?: boolean
}

export const productsApi = {
  findAll: async (params?: FindAllParams) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Product>>>('/api/v1/products', { params })
    return res.data.data
  },

  findById: async (id: string) => {
    const res = await api.get<ApiResponse<Product>>(`/api/v1/products/${id}`)
    return res.data.data
  },

  findByBarcode: async (barcode: string) => {
    const res = await api.get<ApiResponse<Product>>(`/api/v1/products/barcode/${barcode}`)
    return res.data.data
  },

  create: async (data: CreateProductData) => {
    const res = await api.post<ApiResponse<Product>>('/api/v1/products', data)
    return res.data.data
  },

  update: async (id: string, data: Partial<CreateProductData>) => {
    const res = await api.put<ApiResponse<Product>>(`/api/v1/products/${id}`, data)
    return res.data.data
  },

  remove: async (id: string) => {
    await api.delete(`/api/v1/products/${id}`)
  },

  uploadImage: async (id: string, imageUri: string) => {
    const formData = new FormData()
    const filename = imageUri.split('/').pop() ?? 'photo.jpg'
    const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
    formData.append('imagem', { uri: imageUri, name: filename, type } as unknown as Blob)
    const res = await api.post<ApiResponse<Product>>(`/api/v1/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
}
