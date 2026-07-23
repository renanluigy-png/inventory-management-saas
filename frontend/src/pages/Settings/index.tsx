import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import { get, update } from '../../api/settings'
import type { UpdateSettingsData } from '../../api/settings'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SkeletonCard } from '../../components/ui/Skeleton'

const schema = z.object({
  nomeEmpresa: z.string().min(2, 'Nome obrigatório'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  moeda: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Settings() {
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: get,
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateSettingsData) => update(data),
    onSuccess: () => { toast.success('Configurações salvas'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Erro ao salvar configurações'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (settings) {
      reset({
        nomeEmpresa: settings.nomeEmpresa,
        cnpj: settings.cnpj ?? '',
        telefone: settings.telefone ?? '',
        email: settings.email ?? '',
        endereco: settings.endereco ?? '',
        moeda: settings.moeda,
      })
    }
  }, [settings, reset])

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Dados da empresa e preferências do sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <Section title="Dados da Empresa">
          <Input label="Nome da Empresa *" error={errors.nomeEmpresa?.message} {...register('nomeEmpresa')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CNPJ" placeholder="00.000.000/0000-00" {...register('cnpj')} />
            <Input label="Telefone" {...register('telefone')} />
          </div>
          <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Endereço" {...register('endereco')} />
        </Section>

        <Section title="Preferências">
          <Input label="Moeda" placeholder="BRL" {...register('moeda')} />
        </Section>

        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending} leftIcon={<Save className="h-4 w-4" />}>
            Salvar Configurações
          </Button>
        </div>
      </form>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}
