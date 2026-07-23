import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { findAll, create, update, remove } from '../../api/customers'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { formatCPF, formatPhone } from '../../utils/format'
import { maskCPF, maskPhone, unmaskNumber } from '../../utils/masks'
import { useDebounce } from '../../hooks/useDebounce'
import type { Customer } from '../../types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Customers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, debouncedSearch],
    queryFn: () => findAll({ page, limit: 10, search: debouncedSearch || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => { toast.success('Cliente excluído'); qc.invalidateQueries({ queryKey: ['customers'] }); setDeleting(null) },
    onError: () => toast.error('Erro ao excluir cliente'),
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() { setEditing(null); reset({ nome: '', email: '', cpf: '', telefone: '', endereco: '' }); setModalOpen(true) }
  function openEdit(c: Customer) {
    setEditing(c)
    reset({ nome: c.nome, email: c.email ?? '', cpf: c.cpf ?? '', telefone: c.telefone ?? '', endereco: c.endereco ?? '' })
    setModalOpen(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const payload = {
        nome: data.nome,
        email: data.email || undefined,
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : undefined,
        telefone: data.telefone ? data.telefone.replace(/\D/g, '') : undefined,
        endereco: data.endereco || undefined,
      }
      if (editing) {
        await update(editing.id, payload)
        toast.success('Cliente atualizado')
      } else {
        await create(payload)
        toast.success('Cliente criado')
      }
      qc.invalidateQueries({ queryKey: ['customers'] })
      setModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie sua base de clientes</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Cliente</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente..." className="max-w-xs" />

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? <SkeletonTable rows={8} cols={5} /> : customers.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum cliente" description="Cadastre seu primeiro cliente" action={<Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Cliente</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.nome}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.cpf ? formatCPF(c.cpf) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.telefone ? formatPhone(c.telefone) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(c)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
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
        <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome *" error={errors.nome?.message} {...register('nome')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message}
                {...register('cpf')}
                onChange={(e) => { e.target.value = maskCPF(e.target.value); setValue('cpf', e.target.value) }}
              />
              <Input label="Telefone" placeholder="(00) 00000-0000"
                {...register('telefone')}
                onChange={(e) => { e.target.value = maskPhone(e.target.value); setValue('telefone', e.target.value) }}
              />
            </div>
            <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Endereço" {...register('endereco')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir cliente"
          description={`Tem certeza que deseja excluir "${deleting.nome}"?`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
