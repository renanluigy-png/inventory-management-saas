import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../../api/master'
import {
  Building2, Users, TrendingUp, TrendingDown,
  Activity, AlertTriangle, CheckCircle, UserPlus,
} from 'lucide-react'

export default function MasterDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['master-stats'],
    queryFn: masterApi.getStats,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Empresas',
      value: stats?.totalEmpresas ?? 0,
      icon: Building2,
      color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Empresas Ativas',
      value: stats?.empresasAtivas ?? 0,
      icon: CheckCircle,
      color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    },
    {
      label: 'Em Trial',
      value: stats?.empresasTrial ?? 0,
      icon: Activity,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Suspensas',
      value: stats?.empresasSuspensas ?? 0,
      icon: AlertTriangle,
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Total Usuários',
      value: stats?.totalUsuarios ?? 0,
      icon: Users,
      color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Novas Empresas (mês)',
      value: stats?.novosUltimoMes ?? 0,
      icon: UserPlus,
      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Cancelamentos (mês)',
      value: stats?.cancelamentosUltimoMes ?? 0,
      icon: TrendingDown,
      color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    },
    {
      label: 'Churn Rate',
      value: `${stats?.churnRate ?? 0}%`,
      icon: TrendingUp,
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral da Plataforma</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Métricas calculadas a partir do banco de dados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 tabular-nums">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
