import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Users, Search, MoreVertical, Trash2, KeyRound, Ban, CheckCircle2, X, Eye, EyeOff,
} from 'lucide-react'
import { masterApi, type MasterUser } from '../../../api/master'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { cn } from '../../../utils/cn'
import { formatDateTime } from '../../../utils/format'

const ROLES = ['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'] as const

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', GERENTE: 'Gerente', FUNCIONARIO: 'Funcionário', CAIXA: 'Caixa',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  GERENTE:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FUNCIONARIO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CAIXA:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const resetSchema = z.object({ novaSenha: z.string().min(6, 'Mínimo 6 caracteres') })
type ResetForm = z.infer<typeof resetSchema>

export default function MasterUsers() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [roleFilter, setRole]     = useState('')
  const [page, setPage]           = useState(1)
  const [menuId, setMenuId]       = useState<string | null>(null)
  const [resetTarget, setReset]   = useState<MasterUser | null>(null)
  const [showPass, setShowPass]   = useState(false)
  const LIMIT = 15

  const { data, isLoading } = useQuery({
    queryKey: ['master-users', page, search, roleFilter],
    queryFn:  () => masterApi.listUsers({
      page, limit: LIMIT,
      search:  search    || undefined,
      role:    roleFilter || undefined,
    }),
    placeholderData: (prev) => prev,
  })

  const users: MasterUser[] = data?.data ?? []
  const meta = data?.meta

  const blockMut = useMutation({
    mutationFn: (id: string) => masterApi.blockUser(id),
    onSuccess: (u) => {
      toast.success(u.ativo ? 'Usuário desbloqueado' : 'Usuário bloqueado')
      qc.invalidateQueries({ queryKey: ['master-users'] })
    },
    onError: () => toast.error('Erro ao alterar status'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => masterApi.deleteUser(id),
    onSuccess: () => { toast.success('Usuário removido'); qc.invalidateQueries({ queryKey: ['master-users'] }) },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao remover usuário'
      toast.error(msg, { duration: 6000 })
    },
  })

  const resetMut = useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      masterApi.resetUserPassword(id, novaSenha),
    onSuccess: () => { toast.success('Senha redefinida'); setReset(null); resetForm.reset() },
    onError:   () => toast.error('Erro ao redefinir senha'),
  })

  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  function changeSearch(v: string) { setSearch(v); setPage(1) }
  function changeRole(v: string)   { setRole(v);   setPage(1) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta?.total ?? 0} usuário{(meta?.total ?? 0) !== 1 ? 's' : ''} em todas as empresas
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Nome ou e-mail..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => changeRole(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="">Todos os papéis</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Papel</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">Último login</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.nome}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400 text-xs">
                    {u.company?.nomeFantasia ?? u.company?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', ROLE_COLORS[u.role] ?? '')}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                    {u.ultimoLogin ? formatDateTime(u.ultimoLogin) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      u.ativo
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    )}>
                      {u.ativo ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                      {u.ativo ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === u.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                            <MenuBtn
                              icon={u.ativo ? Ban : CheckCircle2}
                              label={u.ativo ? 'Bloquear' : 'Desbloquear'}
                              className={u.ativo ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
                              onClick={() => { setMenuId(null); blockMut.mutate(u.id) }}
                            />
                            <MenuBtn
                              icon={KeyRound}
                              label="Redefinir senha"
                              onClick={() => { setMenuId(null); setReset(u) }}
                            />
                            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                            <MenuBtn
                              icon={Trash2}
                              label="Remover"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                setMenuId(null)
                                if (confirm(`Remover "${u.nome}"? Esta ação não pode ser desfeita.`)) {
                                  deleteMut.mutate(u.id)
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

        {/* Paginação */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-500">
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, meta.total)} de {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ← Anterior
              </button>
              <span className="rounded px-2 py-1 text-xs bg-violet-600 text-white">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.totalPages}
                className="rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <Modal title={`Redefinir senha — ${resetTarget.nome}`} onClose={() => { setReset(null); resetForm.reset() }}>
          <form onSubmit={resetForm.handleSubmit((d) => resetMut.mutate({ id: resetTarget.id, novaSenha: d.novaSenha }))} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              O usuário precisará usar esta nova senha no próximo login. Todos os tokens ativos serão revogados.
            </p>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Nova senha *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                    resetForm.formState.errors.novaSenha ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  )}
                  {...resetForm.register('novaSenha')}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetForm.formState.errors.novaSenha && (
                <p className="text-xs text-red-500">{resetForm.formState.errors.novaSenha.message}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => { setReset(null); resetForm.reset() }}>Cancelar</Button>
              <Button type="submit" loading={resetMut.isPending}>Redefinir</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function MenuBtn({ icon: Icon, label, onClick, className }: {
  icon: React.ElementType; label: string; onClick: () => void; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors', className ?? 'text-gray-700 dark:text-gray-300')}
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
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6">
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
