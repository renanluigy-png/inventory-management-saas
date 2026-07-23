import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { registerCompany } from '../../api/auth'
import { useAuthStore } from '../../store/auth.store'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z.object({
  nomeEmpresa: z.string().min(2, 'Nome da empresa é obrigatório'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  telefoneEmpresa: z.string().optional(),
  nomeAdmin: z.string().min(2, 'Seu nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmarSenha: z.string().min(6),
  cidade: z.string().optional(),
  estado: z.string().optional(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

type FormData = z.infer<typeof schema>

const STEPS = [
  { title: 'Empresa', fields: ['nomeEmpresa', 'nomeFantasia', 'cnpj', 'telefoneEmpresa'] },
  { title: 'Responsável', fields: ['nomeAdmin', 'email', 'senha', 'confirmarSenha'] },
  { title: 'Localização', fields: ['cidade', 'estado'] },
]

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState(0)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nomeEmpresa: '', nomeFantasia: '', cnpj: '', telefoneEmpresa: '',
      nomeAdmin: '', email: '', senha: '', confirmarSenha: '',
      cidade: '', estado: '',
    },
  })

  async function nextStep() {
    const fields = STEPS[step].fields as (keyof FormData)[]
    const valid = await trigger(fields)
    if (valid) setStep((s) => s + 1)
  }

  async function onSubmit(data: FormData) {
    try {
      const result = await registerCompany(data)
      setAuth(result.accessToken, result.user, result.refreshToken)
      localStorage.setItem('onboarding_pending', '1')
      toast.success(`Empresa criada! Bem-vindo, ${result.user.nome}!`)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao criar empresa'
      toast.error(msg)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Criar minha empresa</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Etapa {step + 1} de {STEPS.length}: {STEPS[step].title}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 0 && (
          <>
            <Input label="Nome da empresa *" placeholder="Ex: Loja Exemplo LTDA" error={errors.nomeEmpresa?.message} {...register('nomeEmpresa')} />
            <Input label="Nome fantasia" placeholder="Ex: Loja Exemplo" error={errors.nomeFantasia?.message} {...register('nomeFantasia')} />
            <Input label="CNPJ" placeholder="00.000.000/0001-00" error={errors.cnpj?.message} {...register('cnpj')} />
            <Input label="Telefone" placeholder="(11) 9 9999-9999" error={errors.telefoneEmpresa?.message} {...register('telefoneEmpresa')} />
          </>
        )}

        {step === 1 && (
          <>
            <Input label="Seu nome *" placeholder="Nome do responsável" error={errors.nomeAdmin?.message} {...register('nomeAdmin')} />
            <Input label="E-mail *" type="email" placeholder="seu@email.com" error={errors.email?.message} {...register('email')} />
            <Input
              label="Senha *"
              type={showPass ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              error={errors.senha?.message}
              rightIcon={
                <button type="button" onClick={() => setShowPass((v) => !v)} className="text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('senha')}
            />
            <Input
              label="Confirmar senha *"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repita a senha"
              error={errors.confirmarSenha?.message}
              rightIcon={
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('confirmarSenha')}
            />
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 mb-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Quase lá! Informe sua localização para finalizar o cadastro (opcional).
                </p>
              </div>
            </div>
            <Input label="Cidade" placeholder="Ex: São Paulo" error={errors.cidade?.message} {...register('cidade')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                {...register('estado')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" className="flex-1" onClick={nextStep}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" className="flex-1" loading={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
              Criar empresa
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
