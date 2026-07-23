import api from './client'
import type { ApiResponse } from '../types'

// ── Types ────────────────────────────────────────────────────────

export interface MasterStats {
  totalEmpresas: number
  empresasAtivas: number
  empresasTrial: number
  empresasSuspensas: number
  novosUltimoMes: number
  cancelamentosUltimoMes: number
  mrr: number
  arr: number
  churnRate: number
  totalUsuarios: number
}

export interface CompanyListItem {
  id: string
  nome: string
  nomeFantasia: string | null
  cnpj: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  plano: string
  ativo: boolean
  createdAt: string
  subscription?: {
    status: string
    currentPeriodEnd: string
    plan?: { nome: string; tier: string }
  } | null
  _count?: { usuarios: number }
}

export interface CompanyDetail extends CompanyListItem {
  razaoSocial: string | null
  endereco: string | null
  cep: string | null
  dominioCustom: string | null
  usage: {
    usuarios: number
    produtos: number
    clientes: number
    vendasMes: number
    storageMb: number
  }
}

export interface CreateCompanyData {
  nome: string
  nomeFantasia?: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  planTier?: string
  adminNome: string
  adminEmail: string
  adminSenha: string
}

export interface MasterUser {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  ultimoLogin: string | null
  createdAt: string
  company: { id: string; nome: string; nomeFantasia: string | null } | null
}

export interface MonitorData {
  api:      { status: string; versao: string; node: string }
  database: { status: string; latencia: number }
  memoria:  { heapUsadoMb: number; heapTotalMb: number; rssMb: number; percentual: number }
  uptime:   number
}

export interface AuditLog {
  id: string
  acao: string
  entidade: string
  entidadeId: string | null
  companyId: string | null
  ip: string | null
  dataHora: string
  usuario: { nome: string; email: string } | null
}

interface Meta { total: number; page: number; limit: number; totalPages: number }

const BASE = '/api/v1/master'

// ── API Client ───────────────────────────────────────────────────

export const masterApi = {

  getStats: async (): Promise<MasterStats> => {
    const res = await api.get<ApiResponse<{ stats: MasterStats }>>(`${BASE}/stats`)
    return res.data.data.stats
  },

  // Companies
  listCompanies: async (params?: { page?: number; limit?: number; search?: string; ativo?: boolean }) => {
    const res = await api.get<{ status: string; data: CompanyListItem[]; meta: Meta }>(`${BASE}/companies`, { params })
    return res.data
  },

  getCompany: async (id: string): Promise<CompanyDetail> => {
    const res = await api.get<ApiResponse<{ company: CompanyDetail }>>(`${BASE}/companies/${id}`)
    return res.data.data.company
  },

  createCompany: async (data: CreateCompanyData) => {
    const res = await api.post<ApiResponse<{ company: CompanyDetail; adminUser: unknown }>>(`${BASE}/companies`, data)
    return res.data.data
  },

  updateCompany: async (id: string, data: Partial<CreateCompanyData>) => {
    const res = await api.put<ApiResponse<{ company: CompanyDetail }>>(`${BASE}/companies/${id}`, data)
    return res.data.data.company
  },

  deleteCompany: async (id: string) => {
    await api.delete(`${BASE}/companies/${id}`)
  },

  suspendCompany: async (id: string) => {
    const res = await api.patch<ApiResponse<{ company: CompanyDetail }>>(`${BASE}/companies/${id}/suspend`)
    return res.data.data.company
  },

  activateCompany: async (id: string) => {
    const res = await api.patch<ApiResponse<{ company: CompanyDetail }>>(`${BASE}/companies/${id}/activate`)
    return res.data.data.company
  },

  changeCompanyPlan: async (id: string, tier: string) => {
    const res = await api.patch(`${BASE}/companies/${id}/plan`, { tier })
    return res.data
  },

  impersonateCompany: async (id: string) => {
    const res = await api.post<ApiResponse<{ accessToken: string; expiresIn: number; user: unknown; company: unknown }>>(`${BASE}/companies/${id}/impersonate`)
    return res.data.data
  },

  resetAdminPassword: async (id: string, novaSenha: string) => {
    const res = await api.post(`${BASE}/companies/${id}/reset-admin-password`, { novaSenha })
    return res.data
  },

  // Users
  listUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; companyId?: string; ativo?: boolean }) => {
    const res = await api.get<{ status: string; data: MasterUser[]; meta: Meta }>(`${BASE}/users`, { params })
    return res.data
  },

  blockUser: async (id: string) => {
    const res = await api.patch<ApiResponse<{ user: MasterUser }>>(`${BASE}/users/${id}/block`)
    return res.data.data.user
  },

  deleteUser: async (id: string) => {
    await api.delete(`${BASE}/users/${id}`)
  },

  resetUserPassword: async (id: string, novaSenha: string) => {
    const res = await api.post(`${BASE}/users/${id}/reset-password`, { novaSenha })
    return res.data
  },

  // Monitor
  getMonitor: async (): Promise<MonitorData> => {
    const res = await api.get<ApiResponse<MonitorData>>(`${BASE}/monitor`)
    return res.data.data
  },

  // Audit
  getAuditLogs: async (params?: { page?: number; limit?: number; companyId?: string; acao?: string }) => {
    const res = await api.get<{ status: string; data: { logs: AuditLog[] }; meta: Meta }>(`${BASE}/audit`, { params })
    return res.data
  },
}
