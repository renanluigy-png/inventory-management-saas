import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, QrCode } from 'lucide-react'
import { findAll as findProducts } from '../../api/products'
import { salesApi, findAll as findSales } from '../../api/sales'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { useDebounce } from '../../hooks/useDebounce'
import type { Product, FormaPagamento } from '../../types'

interface CartItem {
  product: Product
  quantidade: number
  preco: number
}

const paymentLabels: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro', CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito', PIX: 'PIX', FIADO: 'Fiado',
}

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  FINALIZADA: 'green', ABERTA: 'yellow', CANCELADA: 'red',
}

export default function Sales() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'pdv' | 'historico'>('pdv')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentModal, setPaymentModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<FormaPagamento>('DINHEIRO')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [troco, setTroco] = useState('')
  const [histPage, setHistPage] = useState(1)

  const { data: productsData } = useQuery({
    queryKey: ['products-search', debouncedSearch],
    queryFn: () => findProducts({ page: 1, limit: 12, search: debouncedSearch || undefined }),
    enabled: !!debouncedSearch,
  })

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales', histPage],
    queryFn: () => findSales({ page: histPage, limit: 10 }),
    enabled: tab === 'historico',
  })

  function addToCart(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantidade: updated[idx].quantidade + 1 }
        return updated
      }
      return [...prev, { product, quantidade: 1, preco: Number(product.preco) }]
    })
    setSearch('')
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.product.id === productId ? { ...i, quantidade: i.quantidade + delta } : i)
        .filter((i) => i.quantidade > 0)
    )
  }

  const total = cart.reduce((acc, i) => acc + i.quantidade * i.preco, 0)
  const trocoValue = selectedPayment === 'DINHEIRO' ? Math.max(0, Number(troco) - total) : 0

  async function handleFinalize() {
    if (cart.length === 0) { toast.error('Carrinho vazio'); return }
    setProcessingPayment(true)
    try {
      const sale = await salesApi.create()
      for (const item of cart) {
        await salesApi.addItem(sale.id, { productId: item.product.id, quantidade: item.quantidade })
      }
      await salesApi.finalize(sale.id, selectedPayment)
      toast.success('Venda finalizada!')
      setCart([])
      setPaymentModal(false)
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao finalizar venda')
    } finally {
      setProcessingPayment(false)
    }
  }

  const salesList = salesData?.data ?? []
  const salesMeta = salesData?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PDV / Vendas</h1>
        <div className="flex gap-2">
          {(['pdv', 'historico'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
              {t === 'pdv' ? 'PDV' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pdv' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto por nome ou código de barras..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            {debouncedSearch && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(productsData?.data ?? []).map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={p.estoque === 0}
                    className="flex flex-col items-start rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-left hover:border-indigo-400 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">{p.nome}</p>
                    <p className="mt-1 text-xs text-gray-400">Estoque: {p.estoque}</p>
                    <p className="mt-2 font-bold text-indigo-600">{formatCurrency(Number(p.preco))}</p>
                  </button>
                ))}
              </div>
            )}
            {!debouncedSearch && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Digite para buscar um produto</p>
              </div>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Carrinho ({cart.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px]">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Carrinho vazio</p>
              ) : cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/30 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.product.nome}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.preco)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 hover:text-red-500">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">{item.quantidade}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantidade >= item.product.estoque} className="flex h-6 w-6 items-center justify-center rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 hover:text-indigo-600 disabled:opacity-50">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => setCart((prev) => prev.filter((i) => i.product.id !== item.product.id))} className="ml-1 text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Total</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
              <Button className="w-full" onClick={() => setPaymentModal(true)} disabled={cart.length === 0} leftIcon={<CreditCard className="h-4 w-4" />}>
                Finalizar Venda
              </Button>
              <button onClick={() => setCart([])} className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors">Limpar carrinho</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {salesLoading ? <SkeletonTable rows={8} cols={5} /> : salesList.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">Nenhuma venda encontrada</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Pagamento</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {salesList.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDateTime(s.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.customer?.nome ?? 'Anônimo'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.formaPagamento ? (paymentLabels[s.formaPagamento] ?? s.formaPagamento) : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(s.total))}</td>
                        <td className="px-4 py-3">
                          <Badge color={statusColor[s.status] ?? 'gray'}>{s.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {salesMeta && salesMeta.totalPages > 1 && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                  <Pagination meta={salesMeta} onPageChange={setHistPage} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {paymentModal && (
        <Modal title="Finalizar Venda" onClose={() => setPaymentModal(false)}>
          <div className="space-y-5">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 text-center">
              <p className="text-sm text-indigo-600 dark:text-indigo-400">Total a pagar</p>
              <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(paymentLabels) as [FormaPagamento, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSelectedPayment(key)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${selectedPayment === key ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                    {key === 'DINHEIRO' ? <Banknote className="h-4 w-4" /> : key === 'PIX' ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {selectedPayment === 'DINHEIRO' && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor recebido</label>
                <input type="number" step="0.01" value={troco} onChange={(e) => setTroco(e.target.value)}
                  placeholder={String(total.toFixed(2))}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {Number(troco) > 0 && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Troco: <span className="font-bold text-green-600">{formatCurrency(trocoValue)}</span>
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setPaymentModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleFinalize} loading={processingPayment} leftIcon={<CreditCard className="h-4 w-4" />}>
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
