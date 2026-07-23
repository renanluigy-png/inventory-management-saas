import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Boxes, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { findAll, create } from '../../api/stock'
import { findAll as findProducts } from '../../api/products'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { formatDateTime } from '../../utils/format'
import type { TipoMovimentacao } from '../../types'

const schema = z.object({
  productId: z.string().min(1, 'Selecione um produto'),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']),
  quantidade: z.string().min(1, 'Informe a quantidade'),
  motivo: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Stock() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tipoSelecionado, setTipoSelecionado] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA')

  const { data, isLoading } = useQuery({
    queryKey: ['stock', page],
    queryFn: () => findAll({ page, limit: 15 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => findProducts({ page: 1, limit: 100 }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'ENTRADA' as const, quantidade: '', motivo: '' },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      await create({
        productId: data.productId,
        tipo: data.tipo as TipoMovimentacao,
        quantidade: Number(data.quantidade),
        motivo: data.motivo || undefined,
      })
      toast.success('Movimentação registrada')
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      setModalOpen(false)
      reset()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao registrar movimentação')
    } finally {
      setSaving(false)
    }
  }

  const movements = data?.data ?? []
  const meta = data?.meta
  const productOptions = [
    { value: '', label: 'Selecione...' },
    ...(productsData?.data ?? []).map((p) => ({ value: p.id, label: p.nome })),
  ]

  const tipoColor: Record<string, 'green' | 'red' | 'blue'> = {
    ENTRADA: 'green', SAIDA: 'red', AJUSTE: 'blue',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Movimentações de estoque</p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Nova Movimentação</Button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? <SkeletonTable rows={10} cols={6} /> : movements.length === 0 ? (
          <EmptyState icon={Boxes} title="Sem movimentações" description="Registre entradas e saídas de estoque" action={<Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Nova Movimentação</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {m.tipo === 'ENTRADA' ? <ArrowUp className="h-3.5 w-3.5 text-green-500" /> : m.tipo === 'SAIDA' ? <ArrowDown className="h-3.5 w-3.5 text-red-500" /> : null}
                        <Badge color={tipoColor[m.tipo] ?? 'gray'}>{m.tipo}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{m.quantidade}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.motivo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.user?.nome ?? '—'}</td>
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
        <Modal title="Nova Movimentação" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select label="Produto *" options={productOptions} error={errors.productId?.message} {...register('productId')} />
            <Select
              label="Tipo *"
              options={[
                { value: 'ENTRADA', label: 'Entrada' },
                { value: 'SAIDA', label: 'Saída' },
                { value: 'AJUSTE', label: 'Ajuste' },
              ]}
              {...register('tipo', { onChange: (e) => setTipoSelecionado(e.target.value) })}
            />
            <Input
              label={tipoSelecionado === 'AJUSTE' ? 'Novo estoque (valor absoluto) *' : 'Quantidade *'}
              type="number"
              min="0"
              error={errors.quantidade?.message}
              {...register('quantidade')}
            />
            <Input label="Motivo" {...register('motivo')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>Registrar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
