import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../../api/master'
import { Activity, Database, Server, Clock, Cpu, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../../../utils/cn'

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function StatusChip({ online }: { online: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      online
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    )}>
      {online ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

function Card({ icon: Icon, title, children, iconColor }: {
  icon: React.ElementType; title: string; children: React.ReactNode; iconColor: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

export default function MasterMonitor() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['master-monitor'],
    queryFn: masterApi.getMonitor,
    refetchInterval: 15_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    )
  }

  const apiOnline = data?.api.status === 'online'
  const dbOnline  = data?.database.status === 'online'
  const mem       = data?.memoria
  const memPct    = mem?.percentual ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Atualiza a cada 15s · última leitura: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR') : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* API */}
        <Card icon={Server} title="API" iconColor="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
          <Row label="Status"   value={<StatusChip online={apiOnline} />} />
          <Row label="Versão"   value={data?.api.versao ?? '—'} />
          <Row label="Node.js"  value={data?.api.node ?? '—'} />
        </Card>

        {/* Database */}
        <Card icon={Database} title="Banco de Dados" iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          <Row label="Status"    value={<StatusChip online={dbOnline} />} />
          <Row label="Latência"  value={dbOnline ? `${data?.database.latencia}ms` : '—'} />
        </Card>

        {/* Memória */}
        <Card icon={Cpu} title="Memória" iconColor="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
          <Row label="Heap usado"  value={`${mem?.heapUsadoMb ?? 0} MB`} />
          <Row label="Heap total"  value={`${mem?.heapTotalMb ?? 0} MB`} />
          <Row label="RSS total"   value={`${mem?.rssMb ?? 0} MB`} />
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uso</span>
              <span>{memPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={cn('h-2 rounded-full transition-all', memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-amber-500' : 'bg-green-500')}
                style={{ width: `${memPct}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Uptime */}
        <Card icon={Clock} title="Uptime" iconColor="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
          <div className="mt-2 text-center">
            <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
              {data ? formatUptime(data.uptime) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-2">desde o último reinício</p>
          </div>
        </Card>

      </div>

      {/* Status geral */}
      <div className={cn(
        'rounded-xl border p-4 flex items-center gap-3',
        apiOnline && dbOnline
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      )}>
        <Activity className={cn('h-5 w-5', apiOnline && dbOnline ? 'text-green-600' : 'text-red-500')} />
        <p className={cn('text-sm font-medium', apiOnline && dbOnline ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {apiOnline && dbOnline ? 'Todos os sistemas operando normalmente.' : 'Atenção: um ou mais serviços com problema.'}
        </p>
      </div>
    </div>
  )
}
