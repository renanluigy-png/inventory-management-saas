import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Building2, Plus, Search, MoreVertical, CheckCircle, AlertTriangle,
  Pause, Play, Trash2, LogIn, KeyRound, X, Eye, EyeOff,
} from 'lucide-react'
import { masterApi, type CompanyListItem } from '../../../api/master'
import { useAuthStore } from '../../../store/auth.store'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { cn } from '../../../utils/cn'

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free', STARTER: 'Starter', PROFESSIONAL: 'Professional',
  BUSINESS: 'Business', ENTERPRISE: 'Enterprise',
}
const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Trial', ATIVA: 'Ativa', PENDENTE: 'Pendente',
  SUSPENSA: 'Suspensa', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
}

const createSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  planTier: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']).default('FREE'),
  adminNome: z.string().min(2, 'Mínimo 2 caracteres'),
  adminEmail: z.string().email('Email inválido'),
  adminSenha: z.string().min(6, 'Mínimo 6 caracteres'),
})
type CreateForm = z.infer<typeof createSchema>

const resetSchema = z.object({ novaSenha: z.string().min(6, 'Mínimo 6 caracteres') })
type ResetForm = z.infer<typeof resetSchema>

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ATIVA: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    TRIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SUSPENSA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CANCELADA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    EXPIRADA: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    PENDENTE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colors[status] ?? colors['PENDENTE'])}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function MasterCompanies() {
  const qc = useQueryClient()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<CompanyListItem | null>(null)
  const [showResetPass, setShowResetPass] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['master-companies', search],
    queryFn: () => masterApi.listCompanies({ search: search || undefined, limit: 50 }),
  })

  const suspendMut = useMutation({
    mutationFn: (id: string) => masterApi.suspendCompany(id),
    onSuccess: () => { toast.success('Empresa suspensa'); qc.invalidateQueries({ queryKey: ['master-companies'] }) },
    onError: () => toast.error('Erro ao suspender empresa'),
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => masterApi.activateCompany(id),
    onSuccess: () => { toast.success('Empresa ativada'); qc.invalidateQueries({ queryKey: ['master-companies'] }) },
    onError: () => toast.error('Erro ao ativar empresa'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => masterApi.deleteCompany(id),
    onSuccess: () => { toast.success('Empresa removida'); qc.invalidateQueries({ queryKey: ['master-companies'] }) },
    onError: () => toast.error('Erro ao remover empresa'),
  })

  const impersonateMut = useMutation({
    mutationFn: (id: string) => masterApi.impersonateCompany(id),
    onSuccess: (data: any) => {
      // Salva sessão do MASTER para poder voltar depois
      const { token, user } = useAuthStore.getState()
      sessionStorage.setItem('master_backup', JSON.stringify({ token, user }))
      toast.success(`Acessando como ${data.user.email}`)
      setAuth(data.accessToken, data.user, undefined)
      window.location.href = '/'
    },
    onError: () => toast.error('Erro ao acessar empresa'),
  })

  const createMut = useMutation({
    mutationFn: masterApi.createCompany,
    onSuccess: () => {
      toast.success('Empresa criada com sucesso!')
      setShowCreate(false)
      createForm.reset()
      qc.invalidateQueries({ queryKey: ['master-companies'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar empresa'),
  })

  const resetMut = useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      masterApi.resetAdminPassword(id, novaSenha),
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso!')
      setResetTarget(null)
      resetForm.reset()
    },
    onError: () => toast.error('Erro ao redefinir senha'),
  })

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { planTier: 'FREE' } })
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  const companies: CompanyListItem[] = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empresas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.meta?.total ?? 0} empresa{(data?.meta?.total ?? 0) !== 1 ? 's' : ''} cadastrada{(data?.meta?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          Nova Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Cidade / UF</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">Plano</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">Desde</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    <Building2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{c.nomeFantasia ?? c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                    {c.cidade && c.estado ? `${c.cidade} / ${c.estado}` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                      {PLAN_LABELS[c.plano] ?? c.plano}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.subscription?.status ?? (c.ativo ? 'ATIVA' : 'SUSPENSA')} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === c.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                            <MenuBtn
                              icon={LogIn}
                              label="Entrar como admin"
                              onClick={() => { setMenuId(null); impersonateMut.mutate(c.id) }}
                            />
                            <MenuBtn
                              icon={KeyRound}
                              label="Redefinir senha admin"
                              onClick={() => { setMenuId(null); setResetTarget(c) }}
                            />
                            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                            {c.ativo ? (
                              <MenuBtn
                                icon={Pause}
                                label="Suspender"
                                onClick={() => { setMenuId(null); suspendMut.mutate(c.id) }}
                                className="text-amber-600 dark:text-amber-400"
                              />
                            ) : (
                              <MenuBtn
                                icon={Play}
                                label="Ativar"
                                onClick={() => { setMenuId(null); activateMut.mutate(c.id) }}
                                className="text-green-600 dark:text-green-400"
                              />
                            )}
                            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                            <MenuBtn
                              icon={Trash2}
                              label="Remover empresa"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setMenuId(null)
                                if (confirm(`Remover "${c.nome}"? Esta ação não pode ser desfeita.`)) {
                                  deleteMut.mutate(c.id)
                                }
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Nova Empresa" onClose={() => setShowCreate(false)}>
          <form onSubmit={createForm.handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dados da empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome *" error={createForm.formState.errors.nome?.message} {...createForm.register('nome')} />
              <Input label="Nome fantasia" {...createForm.register('nomeFantasia')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="CNPJ" {...createForm.register('cnpj')} />
              <Input label="Telefone" {...createForm.register('telefone')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cidade" {...createForm.register('cidade')} />
              <Input label="UF" placeholder="SP" {...createForm.register('estado')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Plano</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                {...createForm.register('planTier')}
              >
                {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pt-2">Administrador inicial</p>
            <Input label="Nome *" error={createForm.formState.errors.adminNome?.message} {...createForm.register('adminNome')} />
            <Input label="E-mail *" type="email" error={createForm.formState.errors.adminEmail?.message} {...createForm.register('adminEmail')} />
            <Input label="Senha *" type="password" error={createForm.formState.errors.adminSenha?.message} {...createForm.register('adminSenha')} />

            <div className="flex gap-2 pt-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" loading={createMut.isPending}>Criar empresa</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <Modal title={`Redefinir senha — ${resetTarget.nomeFantasia ?? resetTarget.nome}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={resetForm.handleSubmit((d) => resetMut.mutate({ id: resetTarget.id, novaSenha: d.novaSenha }))} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Defina uma nova senha para o administrador desta empresa. Todos os tokens ativos serão revogados.
            </p>
            <PasswordInput
              label="Nova senha *"
              error={resetForm.formState.errors.novaSenha?.message}
              {...resetForm.register('novaSenha')}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button type="submit" loading={resetMut.isPending}>Redefinir senha</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function MenuBtn({ icon: Icon, label, onClick, className }: {
  icon: React.ElementType
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
        className ?? 'text-gray-700 dark:text-gray-300'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PasswordInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={cn(
            'w-full rounded-lg border px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
