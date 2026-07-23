import api from './client'
import * as SecureStore from 'expo-secure-store'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import type { ApiResponse } from '../types'

interface FinancialParams {
  dataInicio: string
  dataFim: string
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'

export const reportsApi = {
  financial: async (params: FinancialParams) => {
    const res = await api.get<ApiResponse<unknown>>('/api/v1/reports/financial', { params })
    return res.data.data
  },

  inventory: async () => {
    const res = await api.get<ApiResponse<unknown>>('/api/v1/reports/inventory')
    return res.data.data
  },

  downloadFinancialPdf: async (params: FinancialParams) => {
    const tokenValue = await SecureStore.getItemAsync('accessToken')
    const query = new URLSearchParams({ ...params, format: 'pdf' }).toString()
    const url = `${BASE_URL}/api/v1/reports/financial?${query}`
    const path = `${FileSystem.documentDirectory}relatorio-financeiro.pdf`
    const result = await FileSystem.downloadAsync(url, path, {
      headers: tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {},
    })
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' })
    }
    return result.uri
  },

  downloadInventoryPdf: async () => {
    const tokenValue = await SecureStore.getItemAsync('accessToken')
    const url = `${BASE_URL}/api/v1/reports/inventory?format=pdf`
    const path = `${FileSystem.documentDirectory}relatorio-estoque.pdf`
    const result = await FileSystem.downloadAsync(url, path, {
      headers: tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {},
    })
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' })
    }
    return result.uri
  },
}
