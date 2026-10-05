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
    try {
      // A primeira chamada acorda o serviço do Render. O health pode retornar
      // 503 enquanto o banco termina de conectar, então sua resposta não decide
      // o fluxo: o login vem logo em seguida.
      try {
        await fetch(import.meta.env.VITE_API_URL + '/health', {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(90_000),
        })
      } catch {
        // Timeout/503/CORS no health não impedem a tentativa de autenticação.
      }

      let result
      try {
        result = await login(DEMO_EMAIL, DEMO_SENHA)
      } catch (firstError: any) {
        const status = firstError?.response?.status
        const isTransient = !firstError?.response || [502, 503, 504].includes(status)

        if (!isTransient) throw firstError

        // O processo pode ter acabado de acordar. Uma única nova tentativa
        // evita múltiplos logins e mantém o limite de autenticação previsível.
        await new Promise((resolve) => setTimeout(resolve, 2500))
        result = await login(DEMO_EMAIL, DEMO_SENHA)
      }
      setAuth(result.accessToken, result.user, result.refreshToken)
      navigate(result.user.role === 'MASTER' ? '/master' : '/dashboard')
      toast.success('Bem-vindo à demonstração.')
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (!err?.response
          ? 'A demonstração está indisponível no momento. Verifique sua conexão e tente novamente.'
          : 'Não foi possível entrar na demonstração.')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { loading, enterDemo }
}
