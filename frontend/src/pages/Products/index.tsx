import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Image, Package } from 'lucide-react'
import { toast } from 'sonner'
import { findAll, remove } from '../../api/products'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatCurrency } from '../../utils/format'
import { useDebounce } from '../../hooks/useDebounce'
import ProductModal from './ProductModal'
import type { Product } from '../../types'

export default function Products() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, debouncedSearch],
    queryFn: () => findAll({ page, limit: 10, search: debouncedSearch || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => {
      toast.success('Produto excluído')
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleting(null)
    },
    onError: () => toast.error('Erro ao excluir produto'),
  })

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(p: Product) { setEditing(p); setModalOpen(true) }

  const products = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie o catálogo de produtos</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Produto</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar produto..." className="max-w-xs" />

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="Nenhum produto" description="Crie seu primeiro produto para começar" action={<Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>Novo Produto</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Venda</th>
                  <th className="px-4 py-3 text-right">Estoque</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imagemUrl ? (
                          <img src={p.imagemUrl} alt={p.nome} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <Image className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{p.nome}</p>
                          {p.codigoBarras && <p className="text-xs text-gray-400">{p.codigoBarras}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(Number(p.precoCusto ?? 0))}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(Number(p.preco))}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={p.estoque <= p.estoqueMinimo ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                        {p.estoque}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={p.ativo ? 'green' : 'gray'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
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
        <ProductModal
          product={editing}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSuccess={() => { setModalOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ['products'] }) }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir produto"
          description={`Tem certeza que deseja excluir "${deleting.nome}"?`}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
