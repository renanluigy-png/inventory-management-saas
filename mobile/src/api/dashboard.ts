import api from './client'
import type { ApiResponse, DashboardMetrics, TopProduct, SalesChartPoint, Product } from '../types'

export const dashboardApi = {
  getMetrics: async () => {
    const res = await api.get<ApiResponse<DashboardMetrics>>('/api/v1/dashboard/metrics')
    return res.data.data
  },

  getTopProducts: async () => {
    const res = await api.get<ApiResponse<TopProduct[]>>('/api/v1/dashboard/top-products')
    return res.data.data
  },

  getSalesChart: async (days = 30) => {
    const res = await api.get<ApiResponse<SalesChartPoint[]>>('/api/v1/dashboard/sales-chart', {
      params: { days },
    })
    return res.data.data
  },

  getDeadStock: async () => {
    const res = await api.get<ApiResponse<Product[]>>('/api/v1/dashboard/dead-stock')
    return res.data.data
  },
}
