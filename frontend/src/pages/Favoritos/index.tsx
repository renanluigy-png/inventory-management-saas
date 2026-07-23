import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Trash2, ExternalLink, Package, Users, BarChart2, Globe, Search, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getFavoritos, removeFavorito } from '../../api/favoritos'
import type { Favorito } from '../../api/favoritos'
import { cn } from '../../utils/cn'

const TIPO_ICONS: Record<string, React.ElementType> = {
  produto: Package,
  cliente: Users,
  relatorio: BarChart2,
  pagina: Globe,
  consulta: Search,
}

const TIPO_LABELS: Record<string, string> = {
  produto: 'Produtos',
  cliente: 'Clientes',
  relatorio: 'Relatórios',
  pagina: 'Páginas',
  consulta: 'Consultas',
}

export default function Favoritos() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [activeTipo, setActiveTipo] = useState('todos')

  const { data, isLoading } = useQuery({
    queryKey: ['favoritos'], queryFn: getFavoritos,
  })

  const remove = useMutation({
    mutationFn: removeFavorito,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favoritos'] })
      toast.success('Removido dos favoritos.')
    },
  })

  const items = data?.items ?? []
  const grouped = data?.grouped ?? {}
  const tipos = Object.keys(grouped)

  const displayed = activeTipo === 'todos' ? items : (grouped[activeTipo] ?? [])

  return (
    <div className="space-y-6" role="main" aria-label="Favoritos">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" fill="currentColor" aria-hidden="true" />
          Favoritos
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Seus atalhos rápidos para produtos, clientes, relatórios e mais</p>
      </div>

      {/* Category tabs */}
      {tipos.length > 0 && (
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Categorias de favoritos">
          <button
            role="tab"
            aria-selected={activeTipo === 'todos'}
            onClick={() => setActiveTipo('todos')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', activeTipo === 'todos' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}
          >
            Todos ({items.length})
          </button>
          {tipos.map((tipo) => {
            const Icon = TIPO_ICONS[tipo] ?? Star
            return (
              <button
                key={tipo}
                role="tab"
                aria-selected={activeTipo === tipo}
                onClick={() => setActiveTipo(tipo)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', activeTipo === tipo ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {TIPO_LABELS[tipo] ?? tipo} ({grouped[tipo]?.length ?? 0})
              </button>
            )
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" aria-hidden="true" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Star className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum favorito ainda.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Adicione produtos, clientes e relatórios aos favoritos para acesso rápido.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
          <AnimatePresence>
            {displayed.map((fav: Favorito) => {
              const Icon = TIPO_ICONS[fav.tipo] ?? Star
              return (
                <motion.article
                  key={fav.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all"
                  onClick={() => fav.url && navigate(fav.url)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fav.url && navigate(fav.url)}
                  aria-label={`Favorito: ${fav.label}`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fav.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{TIPO_LABELS[fav.tipo] ?? fav.tipo}</p>
                  </div>
                  <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {fav.url && <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); remove.mutate(fav.id) }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Remover ${fav.label} dos favoritos`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
