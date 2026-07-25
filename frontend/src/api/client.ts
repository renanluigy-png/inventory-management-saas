import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const status: number = err.response?.status
    const msg: string = err.response?.data?.message || 'Erro ao comunicar com o servidor.'

    const isAuthRoute =
      (originalRequest?.url as string)?.includes('/auth/login') ||
      (originalRequest?.url as string)?.includes('/auth/refresh')

    // Rotas de autenticação tratam seu próprio feedback de erro (toast no
    // formulário de login / login de demonstração) — o interceptor não deve duplicar.
    if (isAuthRoute) {
      return Promise.reject(err)
    }

    if (status === 401) {
      // Tenta renovar o access token com o refresh token
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken && !originalRequest._retry) {
        if (isRefreshing) {
          // Enfileira a requisição enquanto o refresh acontece
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          })
          const { accessToken, refreshToken: newRefresh } = response.data.data
          useAuthStore.getState().setTokens(accessToken, newRefresh)
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          processQueue(null, accessToken)
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          useAuthStore.getState().logout()
          toast.error('Sessão expirada. Faça login novamente.')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // Sem refresh token — logout direto
      useAuthStore.getState().logout()
      toast.error('Sessão expirada. Faça login novamente.')
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('Acesso não permitido.')
    } else if (status === 429) {
      toast.error(msg || 'Muitas requisições. Aguarde um momento.')
    } else if (status >= 500) {
      toast.error(`Erro interno: ${msg}`)
    }

    return Promise.reject(err)
  }
)

export default api
