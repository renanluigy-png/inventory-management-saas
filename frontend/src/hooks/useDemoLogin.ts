import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '../api/auth'
import api from '../api/client'
import { useAuthStore } from '../store/auth.store'

export const DEMO_EMAIL = 'admin@demo.com'
export const DEMO_SENHA = '123456'

/**
 * Login automático com a conta de demonstração — usado tanto na Landing Page
 * quanto na tela de Login, para não duplicar o fluxo em dois lugares.
 */
export function useDemoLogin() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  async function enterDemo() {
    setLoading(true)
    try {
      // Acorda a API do Render antes do login para que a primeira tentativa
      // não falhe quando o serviço estava hibernando.
      await api.get('/health', { timeout: 90_000 })

      const result = await login(DEMO_EMAIL, DEMO_SENHA)
      setAuth(result.accessToken, result.user, result.refreshToken)
      navigate(result.user.role === 'MASTER' ? '/master' : '/dashboard')
      toast.success('Bem-vindo à demonstração.')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Não foi possível entrar na demonstração.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { loading, enterDemo }
}
