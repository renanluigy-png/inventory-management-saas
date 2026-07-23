import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Plus, CheckCircle, Clock, Tag, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { getEventos, createEvento, concluirEvento, deleteEvento } from '../../api/agenda'
import type { Evento } from '../../api/agenda'
import { cn } from '../../utils/cn'

const TIPOS = [
  { value: 'COMPROMISSO', label: 'Compromisso', color: '#6366F1' },
  { value: 'LEMBRETE', label: 'Lembrete', color: '#F59E0B' },
  { value: 'TAREFA', label: 'Tarefa', color: '#10B981' },
  { value: 'COBRANCA', label: 'Cobrança', color: '#EF4444' },
  { value: 'VENCIMENTO', label: 'Vencimento', color: '#8B5CF6' },
  { value: 'EVENTO_INTERNO', label: 'Evento Interno', color: '#3B82F6' },
]

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  descricao: z.string().optional(),
  tipo: z.string(),
  inicio: z.string(),
  fim: z.string().optional(),
  diaTodo: z.boolean(),
  cor: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function TipoChip({ tipo }: { tipo: string }) {
  const t = TIPOS.find((x) => x.value === tipo)
  if (!t) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: t.color + '20', color: t.color }}>
      <Tag className="h-2.5 w-2.5" aria-hidden="true" />
      {t.label}
    </span>
  )
}

export default function Agenda() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroConcluido, setFiltroConcluido] = useState<boolean | undefined>(false)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['agenda', filtroTipo, filtroConcluido],
    queryFn: () => getEventos({
      ...(filtroTipo && { tipo: filtroTipo }),
      ...(filtroConcluido !== undefined && { concluido: filtroConcluido }),
    }),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'COMPROMISSO',
      diaTodo: false,
      inicio: new Date().toISOString().slice(0, 16),
    },
  })

  const create = useMutation({
    mutationFn: createEvento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] })
      qc.invalidateQueries({ queryKey: ['eventos-proximos'] })
      toast.success('Evento criado!')
      setShowForm(false)
      reset()
    },
    onError: () => toast.error('Falha ao criar evento.'),
  })

  const concluir = useMutation({
    mutationFn: concluirEvento,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  })

  const remove = useMutation({
    mutationFn: deleteEvento,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] })
      toast.success('Evento removido.')
    },
  })

  const onSubmit = (data: FormData) => {
    create.mutate({
      ...data,
      inicio: new Date(data.inicio).toISOString(),
      fim: data.fim ? new Date(data.fim).toISOString() : undefined,
      concluido: false,
      cor: TIPOS.find((t) => t.value === data.tipo)?.color ?? '#6366F1',
    } as any)
  }

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const eventsByDay: Record<number, Evento[]> = {}
  for (const ev of eventos) {
    const d = new Date(ev.inicio)
    if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(ev)
    }
  }

  return (
    <div className="space-y-6" role="main" aria-label="Agenda">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            Agenda
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Compromissos, tarefas e lembretes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Novo evento"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo Evento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
        <button onClick={() => setFiltroConcluido(false)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroConcluido === false ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')} aria-pressed={filtroConcluido === false}>Pendentes</button>
        <button onClick={() => setFiltroConcluido(true)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroConcluido === true ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')} aria-pressed={filtroConcluido === true}>Concluídos</button>
        <button onClick={() => setFiltroConcluido(undefined)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroConcluido === undefined ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')} aria-pressed={filtroConcluido === undefined}>Todos</button>
        <span className="border-l border-gray-200 dark:border-gray-700 mx-1" aria-hidden="true" />
        {TIPOS.map((t) => (
          <button key={t.value} onClick={() => setFiltroTipo(filtroTipo === t.value ? '' : t.value)}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', filtroTipo === t.value ? 'text-white' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800')}
            style={filtroTipo === t.value ? { background: t.color } : {}}
            aria-pressed={filtroTipo === t.value}
          >{t.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar view */}
        <div className="xl:col-span-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Mês anterior">‹</button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{MESES[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Próximo mês">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-xs font-semibold text-gray-400 py-1" aria-label={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][i]}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const hasEvents = !!eventsByDay[day]?.length
              const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
              return (
                <div key={day} className={cn('relative flex h-8 w-full items-center justify-center rounded-full text-xs cursor-pointer transition-colors', isToday ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300')}>
                  {day}
                  {hasEvents && !isToday && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-500" aria-label="Tem eventos" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Events list */}
        <div className="xl:col-span-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" aria-hidden="true" />
            ))
          ) : eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum evento encontrado.</p>
            </div>
          ) : (
            <AnimatePresence>
              {eventos.map((ev: Evento) => (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn('flex items-start gap-3 rounded-xl border bg-white dark:bg-gray-800 p-4 group transition-all', ev.concluido ? 'border-gray-100 dark:border-gray-800 opacity-60' : 'border-gray-200 dark:border-gray-700')}
                  role="article"
                >
                  <div className="flex-shrink-0 w-1 self-stretch rounded-full" style={{ background: ev.cor ?? '#6366F1' }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={cn('font-medium text-gray-900 dark:text-white text-sm', ev.concluido && 'line-through text-gray-400')}>{ev.titulo}</p>
                      <TipoChip tipo={ev.tipo} />
                    </div>
                    {ev.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.descricao}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {new Date(ev.inicio).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!ev.concluido && (
                      <button onClick={() => concluir.mutate(ev.id)} className="p-1.5 rounded text-gray-400 hover:text-green-500 transition-colors" aria-label="Concluir evento">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => remove.mutate(ev.id)} className="p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors" aria-label="Remover evento">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {ev.concluido && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Concluído" />}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="agenda-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">Novo Evento</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="titulo">Título</label>
                  <input id="titulo" {...register('titulo')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {errors.titulo && <p className="mt-1 text-xs text-red-500" role="alert">{errors.titulo.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="tipo-evento">Tipo</label>
                  <select id="tipo-evento" {...register('tipo')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="inicio-evento">Início</label>
                    <input id="inicio-evento" type="datetime-local" {...register('inicio')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="fim-evento">Fim</label>
                    <input id="fim-evento" type="datetime-local" {...register('fim')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="descricao-evento">Descrição (opcional)</label>
                  <textarea id="descricao-evento" {...register('descricao')} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="dia-todo" type="checkbox" {...register('diaTodo')} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <label htmlFor="dia-todo" className="text-sm text-gray-700 dark:text-gray-300">Dia todo</label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                  <button type="submit" disabled={create.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                    {create.isPending ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
