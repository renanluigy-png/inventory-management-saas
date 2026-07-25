import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, UserRound, Wand2 } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const DEMO_EMAIL = 'admin@demo.com'
const DEMO_SENHA = '123456'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass, setShowPass] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  })

  async function authenticate(email: string, senha: string) {
    const result = await login(email, senha)
    setAuth(result.accessToken, result.user, result.refreshToken)
    toast.success(`Bem-vindo, ${result.user.nome}!`)
    navigate(result.user.role === 'MASTER' ? '/master' : '/dashboard')
  }

  async function onSubmit(data: FormData) {
    try {
      await authenticate(data.email, data.senha)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Credenciais inválidas'
      toast.error(msg)
    }
  }

  async function handleGuestLogin() {
    setGuestLoading(true)
    try {
      await authenticate(DEMO_EMAIL, DEMO_SENHA)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Não foi possível entrar como visitante'
      toast.error(msg)
    } finally {
      setGuestLoading(false)
    }
  }

  function fillDemoCredentials() {
    setValue('email', DEMO_EMAIL, { shouldValidate: true })
    setValue('senha', DEMO_SENHA, { shouldValidate: true })
    toast.info('Credenciais de demonstração preenchidas')
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <div className="mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Entrar na conta</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use suas credenciais de acesso</p>
      </div>

      <Input
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="admin@empresa.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="space-y-1">
        <Input
          label="Senha"
          type={showPass ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.senha?.message}
          rightIcon={
            <button type="button" onClick={() => setShowPass((v) => !v)} className="text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('senha')}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
            Esqueci minha senha
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        loading={isSubmitting}
        disabled={guestLoading}
        leftIcon={<LogIn className="h-4 w-4" />}
      >
        Entrar
      </Button>

      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        <span className="px-3 text-xs font-medium text-gray-400">ou</span>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          loading={guestLoading}
          disabled={isSubmitting}
          leftIcon={<UserRound className="h-4 w-4" />}
          onClick={handleGuestLogin}
        >
          Entrar como Visitante
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isSubmitting || guestLoading}
          leftIcon={<Wand2 className="h-4 w-4" />}
          onClick={fillDemoCredentials}
        >
          Preencher credenciais de demonstração
        </Button>
      </div>
    </motion.form>
  )
}
