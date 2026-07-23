import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { findAll, create, update, remove } from '../../api/users'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Badge } from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { formatDateTime } from '../../utils/format'
import type { User, Role } from '../../types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA']),
  senha: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const roleColors: Record<string, 'red' | 'blue' | 'green' | 'yellow'> = {
  ADMIN: 'red', GERENTE: 'blue', FUNCIONARIO: 'green', CAIXA: 'yellow', MASTER: 'red',
}

export default function Users() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => findAll({ page, limit: 10 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => { toast.success('Usuário excluído'); qc.invalidateQueries({ queryKey: ['users'] }); setDeleting(null) },
    onError: () => toast.error('Erro ao excluir usuário'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() { setEditing(null); reset({ nome: '', email: '', role: 'FUNCIONARIO', senha: '' }); setModalOpen(true) }
  function openEdit(u: User) { setEditing(u); reset({ nome: u.nome, email: u.email, role: (u.role === 'MASTER' ? 'ADMIN' : u.role) as 'ADMIN' | 'GERENTE' | 'FUNCIONARIO' | 'CAIXA', senha: '' }); setModalOpen(true) }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, { nome: data.nome, email: data.email, role: data.role })
        if (data.senha) {
          await import('../../api/users').then(({ changePassword }) =>
            changePassword(editing.id, { novaSenha: data.senha! })
          )
        }
        toast.success('Usuário atualizado')
      } else {
        if (!data.senha) { toast.error('Senha obrigatória'); setSaving(false); return }
        await create({ nome: data.nome, email: data.email, role: data.role, senha: data.senha })
        toast.success('Usuário criado')
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const users = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Usuário</Button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? <SkeletonTable rows={5} cols={5} /> : users.length === 0 ? (
          <EmptyState icon={UserCog} title="Nenhum usuário" description="Crie o primeiro usuário do sistema" action={<Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Usuário</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3"><Badge color={roleColors[u.role]}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge color={u.ativo ? 'green' : 'gray'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(u)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome *" error={errors.nome?.message} {...register('nome')} />
            <Input label="E-mail *" type="email" error={errors.email?.message} {...register('email')} />
            <Select
              label="Perfil *"
              options={[
                { value: 'ADMIN', label: 'Administrador' },
                { value: 'GERENTE', label: 'Gerente' },
                { value: 'FUNCIONARIO', label: 'Funcionário' },
                { value: 'CAIXA', label: 'Caixa' },
              ]}
              {...register('role')}
            />
            <Input
              label={editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
              type="password"
              error={errors.senha?.message}
              {...register('senha')}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir usuário"
          description={`Tem certeza que deseja excluir "${deleting.nome}"?`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
