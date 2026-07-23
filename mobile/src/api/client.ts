import axios, { type AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken')
      await SecureStore.deleteItemAsync('user')
      router.replace('/(auth)/login')
    }
    return Promise.reject(error)
  }
)

export default api
