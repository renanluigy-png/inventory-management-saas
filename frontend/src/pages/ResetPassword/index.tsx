import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  novaSenha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmarSenha: z.string().min(6),
}).refine((d) => d.novaSenha === d.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})
type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    if (!token) {
      toast.error('Token inválido. Solicite um novo link de recuperação.')
      return
    }
    try {
      await authApi.resetPassword(token, data.novaSenha)
      setDone(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao redefinir senha. O link pode ter expirado.'
      toast.error(msg)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Link inválido</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Este link de recuperação é inválido ou expirou.</p>
        <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">Solicitar novo link</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Senha redefinida!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sua senha foi alterada com sucesso. Faça login com sua nova senha.</p>
        <Button className="w-full" onClick={() => navigate('/login')}>Ir para o login</Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-5">
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nova senha</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Defina sua nova senha de acesso.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nova senha"
          type={showPass ? 'text' : 'password'}
          placeholder="Mínimo 6 caracteres"
          error={errors.novaSenha?.message}
          rightIcon={
            <button type="button" onClick={() => setShowPass((v) => !v)} className="text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('novaSenha')}
        />
        <Input
          label="Confirmar nova senha"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Repita a nova senha"
          error={errors.confirmarSenha?.message}
          rightIcon={
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('confirmarSenha')}
        />
        <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<KeyRound className="h-4 w-4" />}>
          Redefinir senha
        </Button>
      </form>
    </div>
  )
}
