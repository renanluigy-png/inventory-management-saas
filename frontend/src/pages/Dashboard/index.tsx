import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  ShoppingCart, Package, Users, TrendingUp, AlertTriangle,
  Target, Calendar, Star, RotateCcw, Eye, EyeOff, GripVertical,
  Clock, DollarSign, Wallet,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getMetrics, getSalesChart, getTopProducts, getSalesByHour } from '../../api/dashboard'
import { getMetasAtivas } from '../../api/metas'
import { getEventosProximos } from '../../api/agenda'
import { getDashboardLayout, saveDashboardLayout, resetDashboardLayout } from '../../api/dashboard-layout'
import type { WidgetConfig } from '../../api/dashboard-layout'
import { StatCard } from '../../components/ui/StatCard'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { formatCurrency, formatNumber } from '../../utils/format'

// ── Widget type map ───────────────────────────────────────────────────────────
const WIDGET_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  vendas_dia:           { label: 'Vendas do Dia', icon: ShoppingCart },
  faturamento:          { label: 'Faturamento', icon: DollarSign },
  lucro:                { label: 'Lucro', icon: TrendingUp },
  caixa:                { label: 'Caixa', icon: Wallet },
  estoque_critico:      { label: 'Estoque Crítico', icon: AlertTriangle },
  top_produtos:         { label: 'Top Produtos', icon: Package },
  vendas_hora:          { label: 'Vendas por Hora', icon: Clock },
  clientes_recorrentes: { label: 'Clientes Recorrentes', icon: Users },
  metas:                { label: 'Metas', icon: Target },
  calendario:           { label: 'Calendário', icon: Calendar },
}

// ── Sortable widget wrapper ───────────────────────────────────────────────────
function SortableWidget({
  widget, metrics, chartData, topProducts, metas, eventos, horaData, onToggleVisibility,
}: {
  widget: WidgetConfig
  metrics: any
  chartData: any[]
  topProducts: any[]
  metas: any[]
  eventos: any[]
  horaData: any[]
  onToggleVisibility: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  if (!widget.visible) return null

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* drag handle + actions */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleVisibility(widget.id)}
          className="p-1 rounded bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow"
          title="Ocultar widget"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded bg-white/80 dark:bg-gray-800/80 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow cursor-grab active:cursor-grabbing"
          title="Mover widget"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>
      <WidgetContent widget={widget} metrics={metrics} chartData={chartData} topProducts={topProducts} metas={metas} eventos={eventos} horaData={horaData} />
    </div>
  )
}

// ── Widget content rendering ──────────────────────────────────────────────────
function WidgetContent({ widget, metrics, chartData, topProducts, metas, eventos, horaData }: {
  widget: WidgetConfig; metrics: any; chartData: any[]; topProducts: any[]; metas: any[]; eventos: any[]; horaData: any[]
}) {
  const base = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 h-full'

  switch (widget.type) {
    case 'vendas_dia':
      return (
        <div className={base}>
          <StatCard title="Vendas do Dia" value={formatNumber(metrics?.quantidadeVendasHoje ?? 0)} icon={ShoppingCart} color="indigo" />
        </div>
      )
    case 'faturamento':
      return (
        <div className={base}>
          <StatCard title="Faturamento do Mês" value={formatCurrency(metrics?.faturamentoMes ?? 0)} icon={DollarSign} color="emerald" />
        </div>
      )
    case 'lucro':
      return (
        <div className={base}>
          <StatCard title="Lucro do Mês" value={formatCurrency(metrics?.lucroMes ?? 0)} icon={TrendingUp} color="purple" />
        </div>
      )
    case 'caixa':
      return (
        <div className={base}>
          <StatCard
            title="Saldo do Caixa"
            value={metrics?.caixaAtual ? formatCurrency(metrics.caixaAtual.saldoAtual) : 'Fechado'}
            icon={Wallet}
            color="blue"
          />
        </div>
      )
    case 'estoque_critico':
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Estoque Crítico
          </h2>
          <div className="space-y-2">
            {metrics?.produtosEstoqueBaixo > 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <span className="font-bold">{metrics.produtosEstoqueBaixo}</span> produto(s) com estoque baixo
              </p>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400">Estoque normalizado ✓</p>
            )}
            {metrics?.produtosSemEstoque > 0 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                <span className="font-bold">{metrics.produtosSemEstoque}</span> produto(s) sem estoque
              </p>
            )}
          </div>
        </div>
      )
    case 'top_produtos':
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Top Produtos</h2>
          <div className="space-y-2">
            {(topProducts ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma venda registrada.</p>
            ) : (topProducts ?? []).slice(0, 5).map((p, i) => (
              <div key={p.produto.id} className="flex items-center gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900 dark:text-white">{p.produto.nome}</p>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{formatCurrency(p.faturamento)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'vendas_hora': {
      const currentHour = new Date().getHours()
      const displayData = horaData.filter((_, i) => i % 2 === 0)
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Vendas por Hora</h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={displayData}>
              <XAxis dataKey="hora" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="vendas" fill="#6366f1" radius={[3, 3, 0, 0]}>
                {displayData.map((item, idx) => {
                  const h = parseInt(item.hora)
                  return <Cell key={idx} fill={h === currentHour || h + 1 === currentHour ? '#4f46e5' : '#6366f1'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }
    case 'clientes_recorrentes':
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Clientes</h2>
          <StatCard title="Total de Clientes" value={formatNumber(metrics?.quantidadeClientes ?? 0)} icon={Users} color="blue" />
        </div>
      )
    case 'metas':
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" /> Metas Ativas
          </h2>
          {metas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma meta ativa.</p>
          ) : (
            <div className="space-y-3">
              {metas.slice(0, 3).map((m) => (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{m.nome}</span>
                    <span className="text-gray-500">{m.porcentagem ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${(m.porcentagem ?? 0) >= 100 ? 'bg-green-500' : m.emDia ? 'bg-indigo-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(m.porcentagem ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    case 'calendario':
      return (
        <div className={base}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-500" /> Próximos Eventos
          </h2>
          {eventos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum evento próximo.</p>
          ) : (
            <div className="space-y-2">
              {eventos.slice(0, 4).map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full" style={{ background: e.cor ?? '#6366F1' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{e.titulo}</p>
                    <p className="text-xs text-gray-400">{new Date(e.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    default:
      return <div className={base}><p className="text-gray-400 text-sm">{widget.type}</p></div>
  }
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [editMode, setEditMode] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { data: layoutData, isLoading: layoutLoading } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: getDashboardLayout,
  })

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'], queryFn: getMetrics,
  })
  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart', period], queryFn: () => getSalesChart(period),
  })
  const { data: topProducts = [] } = useQuery({
    queryKey: ['dashboard-top'], queryFn: () => getTopProducts(5),
  })
  const { data: metas = [] } = useQuery({
    queryKey: ['metas-ativas'], queryFn: getMetasAtivas,
  })
  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos-proximos'], queryFn: getEventosProximos,
  })
  const { data: horaData = [] } = useQuery({
    queryKey: ['dashboard-hours'], queryFn: getSalesByHour,
    refetchInterval: 5 * 60 * 1000,
  })

  const saveLayout = useMutation({
    mutationFn: saveDashboardLayout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] })
      toast.success('Layout salvo com sucesso!')
      setEditMode(false)
      setLocalWidgets(null)
    },
  })

  const resetLayout = useMutation({
    mutationFn: resetDashboardLayout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout'] })
      toast.success('Layout restaurado ao padrão.')
      setLocalWidgets(null)
      setEditMode(false)
    },
  })

  const widgets: WidgetConfig[] = localWidgets ?? layoutData?.widgets ?? []
  const visibleWidgets = widgets.filter((w) => w.visible)

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = widgets.findIndex((w) => w.id === active.id)
    const newIdx = widgets.findIndex((w) => w.id === over.id)
    setLocalWidgets(arrayMove(widgets, oldIdx, newIdx))
  }

  const toggleVisibility = useCallback((id: string) => {
    const updated = widgets.map((w) => w.id === id ? { ...w, visible: !w.visible } : w)
    setLocalWidgets(updated)
  }, [widgets])

  const handleSave = () => {
    if (localWidgets) saveLayout.mutate(localWidgets)
  }

  const periodLabels = { '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', '12m': '12 meses' }

  return (
    <div className="space-y-6" role="main" aria-label="Dashboard">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Visão geral do negócio</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">Arraste para reposicionar</span>
              {/* Hidden widgets */}
              {widgets.filter((w) => !w.visible).map((w) => {
                const Icon = WIDGET_LABELS[w.type]?.icon ?? Package
                return (
                  <button key={w.id} onClick={() => toggleVisibility(w.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <Icon className="h-3.5 w-3.5" />
                    <span>{WIDGET_LABELS[w.type]?.label ?? w.type}</span>
                  </button>
                )
              })}
              <button onClick={() => resetLayout.mutate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar
              </button>
              <button onClick={() => { setLocalWidgets(null); setEditMode(false) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >Cancelar</button>
              <button onClick={handleSave} disabled={saveLayout.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >{saveLayout.isPending ? 'Salvando...' : 'Salvar Layout'}</button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Personalizar dashboard"
            >
              <Star className="h-3.5 w-3.5" /> Personalizar
            </button>
          )}
        </div>
      </div>

      {/* Widgets grid */}
      {layoutLoading || metricsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ${editMode ? 'ring-2 ring-indigo-300 dark:ring-indigo-700 ring-offset-2 rounded-xl p-2 bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
              <AnimatePresence>
                {visibleWidgets.map((widget) => (
                  <motion.div
                    key={widget.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={widget.type === 'calendario' || widget.type === 'vendas_hora' || widget.type === 'clientes_recorrentes' || widget.type === 'metas' ? 'xl:col-span-2' : ''}
                  >
                    {editMode ? (
                      <SortableWidget
                        widget={widget}
                        metrics={metrics}
                        chartData={chartData}
                        topProducts={topProducts as any[]}
                        metas={metas as any[]}
                        eventos={eventos as any[]}
                        horaData={horaData}
                        onToggleVisibility={toggleVisibility}
                      />
                    ) : (
                      <WidgetContent
                        widget={widget}
                        metrics={metrics}
                        chartData={chartData}
                        topProducts={topProducts as any[]}
                        metas={metas as any[]}
                        eventos={eventos as any[]}
                        horaData={horaData}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="rounded-xl border-2 border-indigo-400 bg-white/90 dark:bg-gray-800/90 p-5 shadow-2xl opacity-90">
                <p className="text-sm font-medium text-indigo-600">{WIDGET_LABELS[widgets.find((w) => w.id === activeId)?.type ?? '']?.label ?? 'Widget'}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Sales chart */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-white">Vendas por período</h2>
          <div className="flex gap-1" role="group" aria-label="Período de análise">
            {(Object.keys(periodLabels) as (keyof typeof periodLabels)[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${period === p ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${formatNumber(v)}`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#colorVendas)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
