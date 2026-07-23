import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { login } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  })

  async function onSubmit(data: FormData) {
    try {
      const result = await login(data.email, data.senha)
      setAuth(result.accessToken, result.user, result.refreshToken)
      toast.success(`Bem-vindo, ${result.user.nome}!`)
      if (result.user.role === 'MASTER') {
        navigate('/master')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Credenciais inválidas'
      toast.error(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

      <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<LogIn className="h-4 w-4" />}>
        Entrar
      </Button>
    </form>
  )
}
