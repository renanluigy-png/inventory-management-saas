import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { findAll } from '../../api/audit'
import { Badge } from '../../components/ui/Badge'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { formatDateTime } from '../../utils/format'
import type { AuditAction } from '../../types'

const actionColor: Record<string, 'green' | 'red' | 'blue' | 'yellow' | 'gray'> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', LOGIN: 'yellow',
  LOGOUT: 'gray', PERMISSION_CHANGE: 'blue',
}

export default function Audit() {
  const [page, setPage] = useState(1)
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, entidade, acao, dataInicio, dataFim],
    queryFn: () => findAll({
      page, limit: 15,
      entidade: entidade || undefined,
      acao: (acao as AuditAction) || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    }),
  })

  const logs = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auditoria</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Histórico de ações do sistema</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Entidade (ex: produto)" value={entidade} onChange={(e) => { setEntidade(e.target.value); setPage(1) }} className="w-44" />
        <Select
          options={[
            { value: '', label: 'Todas as ações' },
            { value: 'CREATE', label: 'CREATE' },
            { value: 'UPDATE', label: 'UPDATE' },
            { value: 'DELETE', label: 'DELETE' },
            { value: 'LOGIN', label: 'LOGIN' },
            { value: 'LOGOUT', label: 'LOGOUT' },
            { value: 'PERMISSION_CHANGE', label: 'PERMISSION_CHANGE' },
          ]}
          value={acao}
          onChange={(e) => { setAcao(e.target.value); setPage(1) }}
          className="w-52"
        />
        <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-44" />
        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-44" />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? <SkeletonTable rows={10} cols={5} /> : logs.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">Nenhum log encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(log.dataHora)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.usuario?.nome ?? 'Sistema'}</td>
                    <td className="px-4 py-3">
                      <Badge color={actionColor[log.acao] ?? 'gray'}>{log.acao}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{log.entidade}</span>
                      {log.entidadeId && <span className="ml-1 text-xs text-gray-400">#{log.entidadeId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip ?? '—'}</td>
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
    </div>
  )
}
