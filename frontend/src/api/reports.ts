import api from './client'

export type ReportFormat = 'pdf' | 'excel' | 'csv'

export interface FinancialParams {
  dataInicio?: string
  dataFim?: string
  formaPagamento?: string
  userId?: string
  customerId?: string
  search?: string
  page?: number
  limit?: number
  orderBy?: string
  order?: string
}

export interface InventoryParams {
  search?: string
  categoryId?: string
  page?: number
  limit?: number
  orderBy?: string
  order?: string
}

async function downloadReport(url: string, params: Record<string, unknown>): Promise<Blob> {
  const res = await api.get(url, { params, responseType: 'blob' })
  return res.data as Blob
}

export const reportsApi = {
  // ── Financeiro ──────────────────────────────────────────────
  getFinancial: async (params: FinancialParams) => {
    const res = await api.get('/api/v1/reports/financial', { params })
    return res.data
  },

  exportFinancialPDF: (params: FinancialParams) =>
    downloadReport('/api/v1/reports/financial/pdf', params as Record<string, unknown>),

  exportFinancialExcel: (params: FinancialParams) =>
    downloadReport('/api/v1/reports/financial/excel', params as Record<string, unknown>),

  exportFinancialCSV: (params: FinancialParams) =>
    downloadReport('/api/v1/reports/financial/csv', params as Record<string, unknown>),

  // ── Estoque ─────────────────────────────────────────────────
  getInventory: async (params: InventoryParams) => {
    const res = await api.get('/api/v1/reports/inventory', { params })
    return res.data
  },

  exportInventoryPDF: (params: InventoryParams) =>
    downloadReport('/api/v1/reports/inventory/pdf', params as Record<string, unknown>),

  exportInventoryExcel: (params: InventoryParams) =>
    downloadReport('/api/v1/reports/inventory/excel', params as Record<string, unknown>),

  exportInventoryCSV: (params: InventoryParams) =>
    downloadReport('/api/v1/reports/inventory/csv', params as Record<string, unknown>),

  // Legado (compatibilidade com código antigo)
  financial: async (params: { dataInicio?: string; dataFim?: string; format?: 'json' | 'pdf' | 'excel' | 'csv' }) => {
    const { format = 'json', ...rest } = params
    if (format === 'json') return reportsApi.getFinancial(rest)
    if (format === 'pdf') return reportsApi.exportFinancialPDF(rest)
    if (format === 'excel') return reportsApi.exportFinancialExcel(rest)
    return reportsApi.exportFinancialCSV(rest)
  },

  inventory: async (params: { search?: string; categoryId?: string; format?: 'json' | 'pdf' | 'excel' | 'csv' }) => {
    const { format = 'json', ...rest } = params
    if (format === 'json') return reportsApi.getInventory(rest)
    if (format === 'pdf') return reportsApi.exportInventoryPDF(rest)
    if (format === 'excel') return reportsApi.exportInventoryExcel(rest)
    return reportsApi.exportInventoryCSV(rest)
  },
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getFileExtension(format: ReportFormat): string {
  const map: Record<ReportFormat, string> = { pdf: '.pdf', excel: '.xlsx', csv: '.csv' }
  return map[format]
}
