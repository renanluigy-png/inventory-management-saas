import api from './client'
import { useAuthStore } from '../store/auth.store'
import { API_BASE_URL } from '../config/env'

export interface AIMensagem {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  conteudo: string
  favorita: boolean
  metadados?: { provider?: string; model?: string; tokensUsed?: number } | null
  createdAt: string
}

export interface AIChat {
  id: string
  titulo: string
  arquivado: boolean
  createdAt: string
  updatedAt: string
  _count?: { mensagens: number }
  mensagens?: AIMensagem[]
}

export interface Insight {
  tipo: string
  titulo: string
  descricao: string
  severity: 'info' | 'warning' | 'error' | 'success'
  valor?: number
  entidade?: string
  acao?: string
}

export interface ProviderInfo {
  provider: string
  model: string
  isAI: boolean
  available: boolean
}

// ── Chat ────────────────────────────────────────────────────────────────────

export const sendMessage = async (params: {
  message: string
  chatId?: string
}): Promise<{ chatId: string; response: string; provider: string }> => {
  const { data } = await api.post('/api/v1/ai/chat', params)
  return data.data
}

export const sendMessageStream = async (
  params: { message: string; chatId?: string },
  onChunk: (chunk: string) => void,
  onDone: (chatId: string) => void,
): Promise<void> => {
  const token = useAuthStore.getState().token || ''

  const response = await fetch(`/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...params, stream: true }),
  })

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          if (json.chunk) onChunk(json.chunk)
          if (json.done) onDone(json.chatId)
        } catch { /* ignore */ }
      }
    }
  }
}

export const getChats = async (): Promise<AIChat[]> => {
  const { data } = await api.get('/api/v1/ai/chats')
  return data.data.chats
}

export const getChat = async (id: string): Promise<AIChat> => {
  const { data } = await api.get(`/api/v1/ai/chats/${id}`)
  return data.data.chat
}

export const deleteChat = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/ai/chats/${id}`)
}

export const favoriteMessage = async (id: string): Promise<AIMensagem> => {
  const { data } = await api.patch(`/api/v1/ai/mensagens/${id}/favoritar`)
  return data.data.mensagem
}

export const getFavorites = async (): Promise<AIMensagem[]> => {
  const { data } = await api.get('/api/v1/ai/favoritos')
  return data.data.mensagens
}

// ── Insights ────────────────────────────────────────────────────────────────

export const getInsights = async (): Promise<Insight[]> => {
  const { data } = await api.get('/api/v1/ai/insights')
  return data.data.insights
}

export const getProviderInfo = async (): Promise<ProviderInfo> => {
  const { data } = await api.get('/api/v1/ai/provider')
  return data.data
}

// ── Busca inteligente ────────────────────────────────────────────────────────

export const naturalSearch = async (query: string) => {
  const { data } = await api.post('/api/v1/ai/busca', { query })
  return data.data as { result: string; chatId: string }
}

// ── Export ──────────────────────────────────────────────────────────────────

export const exportChat = (id: string): void => {
  window.open(`${API_BASE_URL}/api/v1/ai/chats/${id}/export`, '_blank')
}
