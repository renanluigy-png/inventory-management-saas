import api from './client'
import type { AuditLog, AuditAction, PaginationMeta } from '../types'

export interface AuditParams { page?: number; limit?: number; entidade?: string; acao?: AuditAction; dataInicio?: string; dataFim?: string; usuarioId?: string }

type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }

export const auditApi = {
  findAll: async (params?: AuditParams) => {
    const res = await api.get<PageRes<AuditLog>>('/api/v1/audit', { params })
    return { data: res.data.data, meta: res.data.meta }
  },
}

export const { findAll } = auditApi
