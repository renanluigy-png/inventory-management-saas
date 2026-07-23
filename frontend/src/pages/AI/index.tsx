import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Bot, AlertTriangle, TrendingUp, TrendingDown, Package,
  Users, Zap, Star, Info, CheckCircle, BarChart2, Search, RefreshCw,
  MessageSquare, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getInsights, getChats, getProviderInfo, deleteChat, naturalSearch } from '../../api/ai'
import type { Insight, AIChat } from '../../api/ai'
import { cn } from '../../utils/cn'

// ── Insight card ─────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    Icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    Icon: Zap,
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    Icon: TrendingUp,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    Icon: Info,
  },
}

function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERITY_STYLES[insight.severity]
  const { Icon } = s
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border p-4 space-y-2', s.bg)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', s.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{insight.titulo}</p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{insight.descricao}</p>
        </div>
      </div>
      {insight.acao && (
        <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium', s.badge)}>
          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {insight.acao}
        </div>
      )}
    </motion.div>
  )
}

// ── Quick search ─────────────────────────────────────────────────────────────

function QuickSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const r = await naturalSearch(query)
      setResult(r.result)
    } catch {
      toast.error('Erro na busca')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-indigo-500" />
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Busca Inteligente</p>
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='Ex: "Clientes que compraram mais de R$1000"'
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Buscar
        </button>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 overflow-hidden"
          >
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIPage() {
  const qc = useQueryClient()

  const { data: insights = [], isLoading: loadingInsights, refetch: refetchInsights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: getInsights,
    staleTime: 5 * 60_000,
  })

  const { data: chats = [] } = useQuery<AIChat[]>({
    queryKey: ['ai-chats'],
    queryFn: getChats,
    staleTime: 30_000,
  })

  const { data: providerInfo } = useQuery({
    queryKey: ['ai-provider'],
    queryFn: getProviderInfo,
    staleTime: 60_000,
  })

  const deleteMut = useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      toast.success('Conversa apagada')
    },
  })

  const severityOrder = { error: 0, warning: 1, success: 2, info: 3 }
  const sortedInsights = [...insights].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  )

  const errors = sortedInsights.filter((i) => i.severity === 'error')
  const warnings = sortedInsights.filter((i) => i.severity === 'warning')
  const positive = sortedInsights.filter((i) => i.severity === 'success' || i.severity === 'info')

  return (
    <div className="space-y-6" role="main" aria-label="Inteligência Artificial">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            Copiloto IA
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Insights automáticos, análises e assistente inteligente do ERP
          </p>
        </div>
        <div className="flex items-center gap-2">
          {providerInfo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <span className={cn('h-2 w-2 rounded-full', providerInfo.isAI ? 'bg-green-400' : 'bg-blue-400')} />
              {providerInfo.isAI ? `IA: ${providerInfo.model}` : 'Modo local'}
            </div>
          )}
          <button
            onClick={() => refetchInsights()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', loadingInsights && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Insights', value: insights.length, Icon: Sparkles, color: 'text-indigo-600' },
          { label: 'Alertas', value: errors.length, Icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Avisos', value: warnings.length, Icon: Zap, color: 'text-amber-600' },
          { label: 'Conversas', value: chats.length, Icon: MessageSquare, color: 'text-blue-600' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center gap-3">
            <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Insights column */}
        <div className="xl:col-span-2 space-y-4">
          {loadingInsights ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : sortedInsights.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tudo em ordem!</p>
              <p className="text-xs text-gray-400 mt-1">Nenhum insight crítico no momento.</p>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">Crítico</h2>
                  <div className="space-y-2">
                    {errors.map((i, idx) => <InsightCard key={idx} insight={i} />)}
                  </div>
                </section>
              )}
              {warnings.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">Atenção</h2>
                  <div className="space-y-2">
                    {warnings.map((i, idx) => <InsightCard key={idx} insight={i} />)}
                  </div>
                </section>
              )}
              {positive.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Informações</h2>
                  <div className="space-y-2">
                    {positive.map((i, idx) => <InsightCard key={idx} insight={i} />)}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Quick Search */}
          <QuickSearch />
        </div>

        {/* Sidebar: history + info */}
        <div className="space-y-4">
          {/* Provider info */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Configuração da IA</p>
            </div>
            {providerInfo ? (
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Provedor</span>
                  <span className="font-medium capitalize">{providerInfo.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modelo</span>
                  <span className="font-medium">{providerInfo.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={cn('font-medium', providerInfo.available ? 'text-green-600' : 'text-red-600')}>
                    {providerInfo.available ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>
                {!providerInfo.isAI && (
                  <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 text-amber-700 dark:text-amber-300">
                    Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY no .env para usar IA real.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            )}
          </div>

          {/* Conversation history */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Conversas Recentes</p>
              <span className="text-xs text-gray-400">{chats.length}</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-80 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  Nenhuma conversa ainda.<br />Use o botão IA no canto inferior direito.
                </div>
              ) : (
                chats.slice(0, 10).map((chat) => (
                  <div key={chat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{chat.titulo}</p>
                      <p className="text-xs text-gray-400">{chat._count?.mensagens ?? 0} msg</p>
                    </div>
                    <button
                      onClick={() => deleteMut.mutate(chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                      title="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-indigo-500" />
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Dica</p>
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              Use o botão <strong>IA</strong> (inferior direito) em qualquer tela para fazer perguntas rápidas sobre vendas, estoque e clientes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
