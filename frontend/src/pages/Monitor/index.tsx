import { useQuery } from '@tanstack/react-query'
import { Activity, Users, ShoppingCart, DollarSign, Server, Cpu, HardDrive, Wifi, RefreshCw, Circle } from 'lucide-react'
import { motion } from 'framer-motion'
import { getServerStats, getOnlineUsers } from '../../api/monitor'
import type { ServerStats, OnlineUser } from '../../api/monitor'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../utils/format'

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  }
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center gap-4">
      <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', colors[color])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function GaugeBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const danger = pct >= 85
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className={cn('text-xs font-semibold', danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>{value.toFixed(1)} / {max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', danger ? 'bg-red-500' : color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-label={online ? 'Online' : 'Offline'}>
      {online && <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', online ? 'bg-green-500' : 'bg-gray-400')} />
    </span>
  )
}

export default function Monitor() {
  const { data: server, isLoading: loadingServer, refetch: refetchServer, isFetching: fetchingServer } = useQuery<ServerStats>({
    queryKey: ['monitor-server'],
    queryFn: getServerStats,
    refetchInterval: 10_000,
  })

  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<OnlineUser[]>({
    queryKey: ['monitor-users'],
    queryFn: getOnlineUsers,
    refetchInterval: 15_000,
  })

  const memPercent = server ? (server.memoria.usadaMB / server.memoria.totalMB) * 100 : 0

  return (
    <div className="space-y-6" role="main" aria-label="Monitor em Tempo Real">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            Monitor
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Desempenho do servidor e atividade em tempo real</p>
        </div>
        <button
          onClick={() => { refetchServer(); refetchUsers() }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Atualizar dados"
        >
          <RefreshCw className={cn('h-4 w-4', fetchingServer && 'animate-spin')} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* Platform stats */}
      {loadingServer ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" aria-hidden="true" />)}
        </div>
      ) : server && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Usuários Online" value={users.length} color="green" />
            <StatCard icon={ShoppingCart} label="Vendas em Andamento" value={server.platform?.vendasEmAndamento ?? 0} color="indigo" />
            <StatCard icon={DollarSign} label="Caixas Abertos" value={server.platform?.caixasAbertos ?? 0} color="amber" />
            <StatCard icon={Server} label="Total de Empresas" value={server.platform?.totalEmpresas ?? 0} color="blue" />
          </div>

          {/* Server health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU / Mem */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                Recursos do Servidor
              </h2>
              <GaugeBar label="CPU" value={server.cpu.usoPct} max={100} color="bg-indigo-500" />
              <GaugeBar label={`Memória (${server.memoria.usadaMB.toFixed(0)} MB / ${server.memoria.totalMB.toFixed(0)} MB)`} value={memPercent} max={100} color="bg-blue-500" />
              {server.disco && <GaugeBar label={`Disco (${server.disco.usadoGB?.toFixed(1)} GB / ${server.disco.totalGB?.toFixed(1)} GB)`} value={server.disco.usadoGB ?? 0} max={server.disco.totalGB ?? 1} color="bg-green-500" />}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span>Uptime: {server.uptime}</span>
                <span>Node: {server.versaoNode}</span>
                <span>Plataforma: {server.plataforma}</span>
              </div>
            </div>

            {/* Connections */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" aria-hidden="true" />
                Conexões Ativas
              </h2>
              {server.conexoes && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(server.conexoes).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                      <p className="text-xs text-gray-400 capitalize">{k}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Status do banco de dados</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusDot online={server.db?.online ?? false} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{server.db?.online ? 'Conectado' : 'Desconectado'}</span>
                  {server.db?.latenciams != null && <span className="text-xs text-gray-400 ml-auto">{server.db.latenciams}ms</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Online users */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" aria-hidden="true" />
            Usuários Online
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 text-xs font-semibold text-green-700 dark:text-green-400">{users.length}</span>
          </h2>
        </div>
        {loadingUsers ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" aria-hidden="true" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            <Users className="h-8 w-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" aria-hidden="true" />
            Nenhum usuário online no momento.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {users.map((u: OnlineUser) => (
              <motion.li
                key={u.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <StatusDot online />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nome}</p>
                  {u.empresa && <p className="text-xs text-gray-400 truncate">{u.empresa}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">
                    Visto {new Date(u.lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {u.pagina && <p className="text-xs text-gray-300 dark:text-gray-600 truncate max-w-32">{u.pagina}</p>}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
