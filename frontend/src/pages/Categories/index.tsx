import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { findAll, create, update, remove } from '../../api/categories'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import type { Category } from '../../types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Categories() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['categories', page],
    queryFn: () => findAll({ page, limit: 10 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => {
      toast.success('Categoria excluída')
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['categories-simple'] })
      setDeleting(null)
    },
    onError: () => toast.error('Erro ao excluir categoria'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() { setEditing(null); reset({ nome: '', descricao: '' }); setModalOpen(true) }
  function openEdit(c: Category) { setEditing(c); reset({ nome: c.nome, descricao: c.descricao ?? '' }); setModalOpen(true) }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, data)
        toast.success('Categoria atualizada')
      } else {
        await create(data)
        toast.success('Categoria criada')
      }
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['categories-simple'] })
      setModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const categories = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organize seus produtos por categoria</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Nova Categoria</Button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? <SkeletonTable rows={5} cols={3} /> : categories.length === 0 ? (
          <EmptyState icon={Tag} title="Nenhuma categoria" description="Crie categorias para organizar seus produtos" action={<Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Nova Categoria</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{c.descricao ?? '—'}</td>
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
        )}
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome *" error={errors.nome?.message} {...register('nome')} />
            <Input label="Descrição" {...register('descricao')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir categoria"
          description={`Tem certeza que deseja excluir "${deleting.nome}"?`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
