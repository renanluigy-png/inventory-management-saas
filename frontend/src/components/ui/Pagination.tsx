import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { PaginationMeta } from '../../types'

interface PaginationProps {
  meta?: PaginationMeta
  // flat props alternative
  currentPage?: number
  totalPages?: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ meta, currentPage, totalPages: tp, totalItems, pageSize, onPageChange, className }: PaginationProps) {
  const page = meta?.page ?? currentPage ?? 1
  const totalPgs = meta?.totalPages ?? tp ?? 1
  const total = meta?.total ?? totalItems ?? 0
  const limit = meta?.limit ?? pageSize ?? 10

  if (totalPgs <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const pages = Array.from({ length: totalPgs }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPgs || Math.abs(p - page) <= 1
  )

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3', className)}>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Exibindo <span className="font-medium">{from}–{to}</span> de{' '}
        <span className="font-medium">{total}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) => {
          const prev = pages[i - 1]
          const showEllipsis = prev && p - prev > 1
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis && <span className="text-gray-400 px-1">…</span>}
              <button
                onClick={() => onPageChange(p)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {p}
              </button>
            </span>
          )
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPgs}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
