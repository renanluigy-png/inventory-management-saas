import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple'
  trend?: { value: number; label?: string }
  subtitle?: string
  className?: string
}

const colors = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-800' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-800' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800' },
}

export function StatCard({ title, value, icon: Icon, color = 'indigo', trend, subtitle, className }: StatCardProps) {
  const c = colors[color]

  return (
    <div className={cn('rounded-xl border bg-white dark:bg-gray-800 p-5 shadow-sm', c.border, className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%</span>
              {trend.label && <span className="text-gray-400 font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn('ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl', c.bg)}>
          <Icon className={cn('h-6 w-6', c.icon)} />
        </div>
      </div>
    </div>
  )
}
