import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { masterApi, type AuditLog } from '../../../api/master'
import { FileText, Search } from 'lucide-react'
import { cn } from '../../../utils/cn'

const ACTION_LABELS: Record<string, string> = {
  LOGIN:            'Login',
  LOGOUT:           'Logout',
  EMPRESA_CRIADA:   'Empresa criada',
  EMPRESA_EDITADA:  'Empresa editada',
  EMPRESA_DELETADA: 'Empresa deletada',
  USUARIO_CRIADO:   'Usuário criado',
  USUARIO_EDITADO:  'Usuário editado',
  USUARIO_DELETADO: 'Usuário removido',
  USUARIO_BLOQUEADO:'Usuário bloqueado',
  SENHA_REDEFINIDA: 'Senha redefinida',
  PRODUTO_CRIADO:   'Produto criado',
  PRODUTO_EDITADO:  'Produto editado',
  PRODUTO_DELETADO: 'Produto deletado',
  VENDA_CRIADA:     'Venda criada',
  VENDA_CANCELADA:  'Venda cancelada',
  IMPERSONATION:    'Impersonação',
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOGOUT:           'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  EMPRESA_CRIADA:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  EMPRESA_EDITADA:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EMPRESA_DELETADA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  USUARIO_CRIADO:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  USUARIO_EDITADO:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  USUARIO_DELETADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  USUARIO_BLOQUEADO:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SENHA_REDEFINIDA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PRODUTO_CRIADO:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PRODUTO_EDITADO:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PRODUTO_DELETADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  VENDA_CRIADA:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VENDA_CANCELADA:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IMPERSONATION:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const LIMIT = 20

export default function MasterAudit() {
  const [page, setPage]         = useState(1)
  const [acao, setAcao]         = useState('')
  const [companyId, setCompany] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['master-audit', page, acao, companyId],
    queryFn: () => masterApi.getAuditLogs({
      page,
      limit: LIMIT,
      acao:      acao      || undefined,
      companyId: companyId || undefined,
    }),
    placeholderData: (prev) => prev,
  })

  const logs: AuditLog[] = data?.data?.logs ?? []
  const meta = data?.meta

  function changeFilter() { setPage(1) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auditoria</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {meta?.total ?? 0} evento{(meta?.total ?? 0) !== 1 ? 's' : ''} registrado{(meta?.total ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={acao}
          onChange={(e) => { setAcao(e.target.value); changeFilter() }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={companyId}
            onChange={(e) => { setCompany(e.target.value); changeFilter() }}
            placeholder="ID da empresa..."
            className="w-56 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Ação</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">Entidade</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">IP</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      ACTION_COLORS[log.acao] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    )}>
                      {ACTION_LABELS[log.acao] ?? log.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400 text-xs">
                    <span className="font-mono">{log.entidade}</span>
                    {log.entidadeId && (
                      <span className="ml-1 text-gray-400">#{log.entidadeId.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.usuario ? (
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{log.usuario.nome}</p>
                        <p className="text-xs text-gray-400">{log.usuario.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sistema</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-gray-500 dark:text-gray-400">
                    {log.ip ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                    {new Date(log.dataHora).toLocaleString('pt-BR')}
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
    </div>
  )
}
