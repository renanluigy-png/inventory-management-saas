import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Terminal, AlertTriangle, Info, Zap, Bug, Trash2, RefreshCw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { getTechLogs, getTechLogSummary, cleanupTechLogs } from '../../api/techlogs'
import type { TechLog } from '../../api/techlogs'
import { cn } from '../../utils/cn'

const NIVEL_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DEBUG: { label: 'Debug', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', Icon: Bug },
  INFO:  { label: 'Info',  color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-900/20', Icon: Info },
  WARN:  { label: 'Aviso', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', Icon: AlertTriangle },
  ERROR: { label: 'Erro',  color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20', Icon: AlertTriangle },
  CRITICAL: { label: 'Crítico', color: 'text-red-700 font-bold', bg: 'bg-red-100 dark:bg-red-900/40', Icon: Zap },
}

export default function TechLogs() {
  const qc = useQueryClient()
  const [nivel, setNivel] = useState('')
  const [categoria, setCategoria] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['techlogs', nivel, categoria, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 30 }
      if (nivel) params.nivel = nivel
      if (categoria) params.categoria = categoria
      return getTechLogs(params)
    },
    refetchInterval: 30_000,
  })

  const { data: summary } = useQuery({
    queryKey: ['techlog-summary'],
    queryFn: getTechLogSummary,
    refetchInterval: 30_000,
  })

  const cleanup = useMutation({
    mutationFn: () => cleanupTechLogs(30),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['techlogs'] })
      qc.invalidateQueries({ queryKey: ['techlog-summary'] })
      toast.success('Logs mais antigos que 30 dias removidos.')
    },
    onError: () => toast.error('Falha ao limpar logs.'),
  })

  const logs: TechLog[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6" role="main" aria-label="Logs Técnicos">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Terminal className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            Logs Técnicos
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Erros, exceções e eventos de sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Atualizar logs"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
            Atualizar
          </button>
          <button
            onClick={() => cleanup.mutate()}
            disabled={cleanup.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            aria-label="Limpar logs antigos"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Limpar &gt;30d
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(NIVEL_META).filter(([k]) => k !== 'DEBUG').map(([nivel, meta]) => {
            const Icon = meta.Icon
            const count = summary.countByNivel?.[nivel] ?? 0
            return (
              <button
                key={nivel}
                onClick={() => setNivel(prev => prev === nivel ? '' : nivel)}
                className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-all', meta.bg, nivel === nivel ? 'ring-2 ring-indigo-500' : 'border-transparent hover:opacity-90')}
                aria-pressed={false}
              >
                <Icon className={cn('h-5 w-5', meta.color)} aria-hidden="true" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{meta.label}</p>
                  <p className={cn('text-lg font-bold', meta.color)} aria-label={`${count} logs de nível ${meta.label}`}>{count}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <div className="flex gap-1.5">
          {['', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].map((n) => (
            <button
              key={n || 'all'}
              onClick={() => { setNivel(n); setPage(1) }}
              className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', nivel === n ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}
              aria-pressed={nivel === n}
            >
              {n || 'Todos'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Categoria..."
          value={categoria}
          onChange={(e) => { setCategoria(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Filtrar por categoria"
        />
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto" role="region" aria-label="Tabela de logs">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700" role="table">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80">
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nível</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mensagem</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duração</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">
                    <Terminal className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" aria-hidden="true" />
                    Nenhum log encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                logs.map((log: TechLog) => {
                  const meta = NIVEL_META[log.nivel] ?? NIVEL_META.INFO
                  const Icon = meta.Icon
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', meta.color)}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-block rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400">{log.categoria}</span>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate" title={log.mensagem}>{log.mensagem}</p>
                        {log.stackTrace && (
                          <details className="mt-0.5">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">Stack trace</summary>
                            <pre className="mt-1 text-xs text-red-500 overflow-x-auto whitespace-pre-wrap max-h-32 p-1 bg-red-50 dark:bg-red-900/10 rounded">{log.stackTrace}</pre>
                          </details>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {log.statusCode ? (
                          <span className={cn('text-xs font-mono font-semibold', log.statusCode >= 500 ? 'text-red-600' : log.statusCode >= 400 ? 'text-amber-600' : 'text-green-600')}>
                            {log.statusCode}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {log.duracao != null ? (
                          <span className={cn('text-xs font-mono', log.duracao >= 1000 ? 'text-red-600' : log.duracao >= 500 ? 'text-amber-600' : 'text-gray-500')}>
                            {log.duracao}ms
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400">{total} registros · página {page} de {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700" aria-label="Página anterior">‹</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700" aria-label="Próxima página">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
