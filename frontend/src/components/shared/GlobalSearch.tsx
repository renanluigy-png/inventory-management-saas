import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ShoppingBag, Users, BarChart2, Tag, Percent } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchApi, type SearchResult } from '../../api/search'
import { useDebounce } from '../../hooks/useDebounce'
import { cn } from '../../utils/cn'

type GroupKey = keyof Omit<SearchResult, 'query' | 'total'>

const GROUP_CONFIG: Record<GroupKey, { label: string; icon: React.ElementType; color: string }> = {
  produtos: { label: 'Produtos', icon: ShoppingBag, color: 'text-indigo-600' },
  clientes: { label: 'Clientes', icon: Users, color: 'text-emerald-600' },
  vendas: { label: 'Vendas', icon: BarChart2, color: 'text-blue-600' },
  categorias: { label: 'Categorias', icon: Tag, color: 'text-yellow-600' },
  promocoes: { label: 'Promoções', icon: Percent, color: 'text-pink-600' },
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const debouncedQuery = useDebounce(query, 350)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResult(null)
      return
    }
    setLoading(true)
    searchApi
      .search(debouncedQuery)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
      setOpen(false)
      setQuery('')
      setResult(null)
    },
    [navigate]
  )

  const hasResults = result && result.total > 0

  return (
    <div ref={containerRef} className="relative w-64 lg:w-80">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar... (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResult(null) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl z-50 dark:border-gray-700 dark:bg-gray-800 overflow-hidden max-h-[480px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum resultado para "{query}"
            </div>
          )}

          {!loading && hasResults && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(Object.keys(GROUP_CONFIG) as GroupKey[]).map((group) => {
                const items = result[group]
                if (!items.length) return null
                const config = GROUP_CONFIG[group]
                const Icon = config.icon

                return (
                  <div key={group}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <Icon size={13} className={config.color} />
                      <span className={cn('text-xs font-semibold uppercase tracking-wide', config.color)}>
                        {config.label}
                      </span>
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                        onClick={() => handleNavigate(item._path)}
                      >
                        <span className="text-sm text-gray-900 dark:text-white truncate">
                          {item._label}
                        </span>
                        {group === 'produtos' && 'preco' in item && (
                          <span className="ml-auto flex-shrink-0 text-xs text-gray-500">
                            Estoque: {'estoque' in item ? (item as any).estoque : ''}
                          </span>
                        )}
                        {group === 'vendas' && 'status' in item && (
                          <span className="ml-auto flex-shrink-0 text-xs text-gray-500">
                            {'status' in item ? (item as any).status : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )
              })}
              <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                {result.total} resultado(s) encontrado(s)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
