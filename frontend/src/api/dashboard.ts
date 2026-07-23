import api from './client'
import type { ApiResponse, DashboardMetrics, TopProduct, SalesChartPoint } from '../types'

export type ChartPeriod = '7d' | '30d' | '90d' | '12m'

export const dashboardApi = {
  getMetrics: async () => {
    const res = await api.get<ApiResponse<DashboardMetrics>>('/api/v1/dashboard')
    return res.data.data
  },
  getTopProducts: async (limit = 10) => {
    const res = await api.get<ApiResponse<TopProduct[]>>('/api/v1/dashboard/top-products', { params: { limit } })
    return res.data.data
  },
  getSalesChart: async (period: ChartPeriod = '30d') => {
    const res = await api.get<ApiResponse<SalesChartPoint[]>>('/api/v1/dashboard/sales-chart', { params: { period } })
    return res.data.data
  },
  getDeadStock: async (days = 60) => {
    const res = await api.get<ApiResponse<{ data: unknown[]; meta: unknown }>>('/api/v1/dashboard/dead-stock', { params: { days } })
    return res.data.data
  },
  getSalesByHour: async () => {
    const res = await api.get<ApiResponse<Array<{ hora: string; vendas: number; valor: number }>>>('/api/v1/dashboard/sales-by-hour')
    return res.data.data
  },
}

export const { getMetrics, getTopProducts, getSalesChart, getDeadStock, getSalesByHour } = dashboardApi
