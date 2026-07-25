import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '../api/auth'
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

    const promise = (async () => {
      const result = await login(DEMO_EMAIL, DEMO_SENHA)
      setAuth(result.accessToken, result.user, result.refreshToken)
      navigate(result.user.role === 'MASTER' ? '/master' : '/dashboard')
      return result.user
    })()

    toast.promise(promise, {
      loading: 'Entrando na demonstração...',
      success: (user: { nome: string }) => `Bem-vindo, ${user.nome}!`,
      error: (err: { response?: { data?: { message?: string } } }) =>
        err?.response?.data?.message ?? 'Não foi possível entrar na demonstração',
    })

    try {
      await promise
    } catch {
      // erro já exibido pelo toast.promise acima
    } finally {
      setLoading(false)
    }
  }

  return { loading, enterDemo }
}
