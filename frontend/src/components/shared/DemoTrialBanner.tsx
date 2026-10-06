import { useEffect, useMemo, useState } from 'react'
import { Clock3, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import {
  DEMO_TRIAL_DURATION_MS,
  getDemoTrial,
  getDemoTrialRemainingMs,
} from '../../utils/demoTrial'

interface DemoTrialBannerProps {
  onExpired: () => void
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / 1_440)
  const hours = Math.floor((totalMinutes % 1_440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes.toString().padStart(2, '0')}min`
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}min`
  return `${minutes}min`
}

export function DemoTrialBanner({ onExpired }: DemoTrialBannerProps) {
  const [remainingMs, setRemainingMs] = useState(() => getDemoTrialRemainingMs())
  const trial = getDemoTrial()

  useEffect(() => {
    if (!trial) return

    const update = () => {
      const next = getDemoTrialRemainingMs()
      setRemainingMs(next)
      if (next <= 0) onExpired()
    }

    update()
    const interval = window.setInterval(update, 1_000)
    return () => window.clearInterval(interval)
  }, [trial?.startedAt, trial?.expiresAt, onExpired])

  const progress = useMemo(() => {
    if (!trial) return 0
    return Math.min(100, Math.max(0, (remainingMs / DEMO_TRIAL_DURATION_MS) * 100))
  }, [remainingMs, trial])

  if (!trial || remainingMs <= 0) return null

  const isWarning = remainingMs <= 24 * 60 * 60 * 1000

  return (
    <div className="flex-shrink-0 border-b border-indigo-100 bg-indigo-50/80 px-4 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/25">
      <div className="mx-auto flex w-full max-w-none items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 dark:bg-gray-900 dark:text-indigo-400 dark:ring-indigo-900/60">
          <Sparkles className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              Demonstração
            </p>
            <span className="hidden text-[11px] text-indigo-500 dark:text-indigo-400 sm:inline">
              Acesso gratuito por 7 dias
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
            <motion.div
              className={cn(
                'h-full rounded-full transition-colors',
                isWarning ? 'bg-amber-500' : 'bg-indigo-500'
              )}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className={cn(
          'flex flex-shrink-0 items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 shadow-sm dark:bg-gray-900',
          isWarning
            ? 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300'
            : 'border-indigo-100 text-indigo-700 dark:border-indigo-900 dark:text-indigo-300'
        )}>
          <Clock3 className="h-3.5 w-3.5" />
          <div className="leading-none text-right">
            <p className="text-[9px] uppercase tracking-wide opacity-60">Expira em</p>
            <p className="mt-0.5 whitespace-nowrap font-mono text-xs font-bold">
              {formatRemaining(remainingMs)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
