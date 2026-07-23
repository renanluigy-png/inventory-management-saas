import { cn } from '../../utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  color?: BadgeColor
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const colorToVariant: Record<BadgeColor, BadgeVariant> = {
  gray: 'default', green: 'success', yellow: 'warning', red: 'danger', blue: 'info', purple: 'purple',
}

export function Badge({ children, variant, color, className }: BadgeProps) {
  const resolvedVariant = variant ?? (color ? colorToVariant[color] : 'default')
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantStyles[resolvedVariant], className)}>
      {children}
    </span>
  )
}
