import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Target, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { getMetasAtivas, getMetas, createMeta, deleteMeta } from '../../api/metas'
import type { Meta } from '../../api/metas'
import { formatCurrency, formatNumber } from '../../utils/format'

const TIPOS = [
  { value: 'VENDAS_VALOR', label: 'Vendas (valor)' },
  { value: 'VENDAS_QUANTIDADE', label: 'Vendas (quantidade)' },
  { value: 'CLIENTES_NOVOS', label: 'Novos Clientes' },
  { value: 'TICKET_MEDIO', label: 'Ticket Médio' },
  { value: 'MARGEM_LUCRO', label: 'Margem de Lucro' },
]

const PERIODOS = [
  { value: 'DIARIO', label: 'Diário' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'ANUAL', label: 'Anual' },
]

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  tipo: z.string(),
  periodo: z.string(),
  valorAlvo: z.number({ invalid_type_error: 'Informe o valor alvo' }).positive(),
  inicioEm: z.string(),
  fimEm: z.string(),
  descricao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function ProgressBar({ porcentagem, emDia }: { porcentagem: number; emDia?: boolean }) {
  const color = porcentagem >= 100 ? 'bg-green-500' : emDia ? 'bg-indigo-500' : 'bg-amber-500'
  return (
    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
      <motion.div
        className={`absolute left-0 top-0 h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(porcentagem, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function Metas() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas-ativas'], queryFn: getMetasAtivas,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'VENDAS_VALOR',
      periodo: 'MENSAL',
      inicioEm: new Date().toISOString().slice(0, 10),
      fimEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  })

  const create = useMutation({
    mutationFn: createMeta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas-ativas'] })
      toast.success('Meta criada com sucesso!')
      setShowForm(false)
      reset()
    },
    onError: () => toast.error('Falha ao criar meta.'),
  })

  const remove = useMutation({
    mutationFn: deleteMeta,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas-ativas'] })
      toast.success('Meta removida.')
    },
  })

  const onSubmit = (data: FormData) => {
    create.mutate({
      ...data,
      inicioEm: new Date(data.inicioEm).toISOString(),
      fimEm: new Date(data.fimEm).toISOString(),
      ativa: true,
    } as any)
  }

  return (
    <div className="space-y-6" role="main" aria-label="Sistema de Metas">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            Metas
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Defina e acompanhe as metas de desempenho</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Nova meta"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nova Meta
        </button>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog" aria-modal="true" aria-labelledby="modal-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">Nova Meta</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="nome">Nome da meta</label>
                  <input id="nome" {...register('nome')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-describedby={errors.nome ? 'nome-error' : undefined} />
                  {errors.nome && <p id="nome-error" className="mt-1 text-xs text-red-500" role="alert">{errors.nome.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="tipo">Tipo</label>
                    <select id="tipo" {...register('tipo')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="periodo">Período</label>
                    <select id="periodo" {...register('periodo')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="valorAlvo">Valor Alvo</label>
                  <input id="valorAlvo" type="number" step="0.01" {...register('valorAlvo', { valueAsNumber: true })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-describedby={errors.valorAlvo ? 'valor-error' : undefined} />
                  {errors.valorAlvo && <p id="valor-error" className="mt-1 text-xs text-red-500" role="alert">{errors.valorAlvo.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="inicioEm">Início</label>
                    <input id="inicioEm" type="date" {...register('inicioEm')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="fimEm">Fim</label>
                    <input id="fimEm" type="date" {...register('fimEm')} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
                  <button type="submit" disabled={create.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                    {create.isPending ? 'Criando...' : 'Criar Meta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metas list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" aria-hidden="true" />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma meta ativa.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crie a primeira meta para começar a acompanhar o desempenho.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" role="list" aria-label="Lista de metas">
          <AnimatePresence>
            {metas.map((meta: Meta) => (
              <motion.article
                key={meta.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col gap-3 group"
                role="listitem"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{meta.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TIPOS.find((t) => t.value === meta.tipo)?.label} · {PERIODOS.find((p) => p.value === meta.periodo)?.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(meta.porcentagem ?? 0) >= 100 ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Meta atingida" />
                    ) : meta.emDia ? (
                      <TrendingUp className="h-4 w-4 text-indigo-500 flex-shrink-0" aria-label="Em dia" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-amber-500 flex-shrink-0" aria-label="Atrasada" />
                    )}
                    <button
                      onClick={() => remove.mutate(meta.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      aria-label={`Remover meta ${meta.nome}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <ProgressBar porcentagem={meta.porcentagem ?? 0} emDia={meta.emDia} />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Atual</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {meta.tipo === 'VENDAS_VALOR' || meta.tipo === 'TICKET_MEDIO' || meta.tipo === 'MARGEM_LUCRO'
                        ? formatCurrency(meta.valorAtual ?? 0)
                        : formatNumber(meta.valorAtual ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Alvo</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {meta.tipo === 'VENDAS_VALOR' || meta.tipo === 'TICKET_MEDIO' || meta.tipo === 'MARGEM_LUCRO'
                        ? formatCurrency(Number(meta.valorAlvo))
                        : formatNumber(Number(meta.valorAlvo))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {meta.diasRestantes ?? 0} dias restantes
                  </span>
                  <span className={`font-semibold ${(meta.porcentagem ?? 0) >= 100 ? 'text-green-500' : meta.emDia ? 'text-indigo-500' : 'text-amber-500'}`}>
                    {meta.porcentagem ?? 0}%
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
