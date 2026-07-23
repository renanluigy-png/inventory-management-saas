import { cn } from '../../utils/cn'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  fullscreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const iconSizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

export function Loading({ fullscreen, size = 'md', text, className }: LoadingProps) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-8', className)}>
      <Loader2 className={cn('animate-spin text-indigo-600', iconSizes[size])} />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  )
}
