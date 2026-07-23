import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { reportsApi, downloadBlob } from '../../api/reports'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatCurrency, formatNumber } from '../../utils/format'

export default function Reports() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['report-financial', dateFrom, dateTo],
    queryFn: () => reportsApi.financial({ dataInicio: dateFrom, dataFim: dateTo, format: 'json' }),
  })

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory({ format: 'json' }),
  })

  async function handleDownload(type: 'financial-pdf' | 'financial-excel' | 'inventory-pdf' | 'inventory-excel') {
    setDownloading(type)
    try {
      let blob: Blob
      let filename: string

      if (type === 'financial-pdf') {
        blob = await reportsApi.financial({ dataInicio: dateFrom, dataFim: dateTo, format: 'pdf' }) as Blob
        filename = `financeiro_${dateFrom}_${dateTo}.pdf`
      } else if (type === 'financial-excel') {
        blob = await reportsApi.financial({ dataInicio: dateFrom, dataFim: dateTo, format: 'excel' }) as Blob
        filename = `financeiro_${dateFrom}_${dateTo}.xlsx`
      } else if (type === 'inventory-pdf') {
        blob = await reportsApi.inventory({ format: 'pdf' }) as Blob
        filename = `estoque_${today}.pdf`
      } else {
        blob = await reportsApi.inventory({ format: 'excel' }) as Blob
        filename = `estoque_${today}.xlsx`
      }

      downloadBlob(blob, filename)
      toast.success('Download iniciado')
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Exporte dados financeiros e de estoque</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Relatório Financeiro</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Data inicial" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
          <Input label="Data final" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleDownload('financial-pdf')} loading={downloading === 'financial-pdf'} leftIcon={<Download className="h-4 w-4" />}>PDF</Button>
            <Button variant="secondary" onClick={() => handleDownload('financial-excel')} loading={downloading === 'financial-excel'} leftIcon={<Download className="h-4 w-4" />}>Excel</Button>
          </div>
        </div>
        {finLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
          </div>
        ) : financial && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total de Vendas" value={formatCurrency(Number((financial as any).totalVendas ?? 0))} />
            <Metric label="Nº de Vendas" value={formatNumber((financial as any).quantidadeVendas ?? 0)} />
            <Metric label="Ticket Médio" value={formatCurrency(Number((financial as any).ticketMedio ?? 0))} />
            <Metric label="Lucro Estimado" value={formatCurrency(Number((financial as any).lucroEstimado ?? 0))} color="green" />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Relatório de Estoque</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleDownload('inventory-pdf')} loading={downloading === 'inventory-pdf'} leftIcon={<Download className="h-4 w-4" />}>PDF</Button>
            <Button variant="secondary" onClick={() => handleDownload('inventory-excel')} loading={downloading === 'inventory-excel'} leftIcon={<Download className="h-4 w-4" />}>Excel</Button>
          </div>
        </div>
        {invLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
          </div>
        ) : inventory && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric label="Total de Produtos" value={formatNumber((inventory as any).totalProdutos ?? 0)} />
              <Metric label="Valor em Estoque" value={formatCurrency(Number((inventory as any).valorTotal ?? 0))} />
              <Metric label="Estoque Baixo" value={formatNumber((inventory as any).produtosEstoqueBaixo ?? 0)} color="red" />
            </div>
            {(inventory as any).produtos?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <th className="px-4 py-2">Produto</th>
                      <th className="px-4 py-2 text-right">Estoque</th>
                      <th className="px-4 py-2 text-right">Mínimo</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(inventory as any).produtos.slice(0, 10).map((p: any) => (
                      <tr key={p.id} className={p.estoque <= (p.estoqueMinimo ?? 0) ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{p.nome}</td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{p.estoque}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{p.estoqueMinimo ?? 0}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800 dark:text-gray-200">{formatCurrency(Number(p.preco ?? 0) * (p.estoque ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  )
}
