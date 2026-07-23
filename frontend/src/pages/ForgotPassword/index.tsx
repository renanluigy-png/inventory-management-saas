import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch {
      toast.error('Erro ao enviar e-mail. Tente novamente.')
    }
  }

  return (
    <div className="w-full">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-5">
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">E-mail enviado!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve. Verifique também sua pasta de spam.
          </p>
          <Link to="/login" className="block text-sm text-indigo-600 hover:underline">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recuperar senha</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail cadastrado"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<Mail className="h-4 w-4" />}>
              Enviar link de recuperação
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
