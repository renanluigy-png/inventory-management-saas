import { Boxes, Users, LayoutDashboard, BarChart2, Building2, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FadeIn } from '../../../components/ui/FadeIn'

interface Benefit {
  icon: LucideIcon
  title: string
  description: string
}

const benefits: Benefit[] = [
  { icon: Boxes, title: 'Controle de Estoque', description: 'Entradas, saídas e saldo em tempo real, sem planilhas.' },
  { icon: Users, title: 'Gestão de Clientes', description: 'Histórico de compras e relacionamento centralizados.' },
  { icon: LayoutDashboard, title: 'Dashboard Inteligente', description: 'Indicadores e métricas do negócio em um só lugar.' },
  { icon: BarChart2, title: 'Relatórios', description: 'Exportação e análises para decisões rápidas.' },
  { icon: Building2, title: 'Multiempresa', description: 'Gerencie várias empresas com dados isolados.' },
  { icon: ShieldCheck, title: 'Segurança', description: 'Autenticação JWT, auditoria e controle de acesso por papel.' },
  { icon: Smartphone, title: 'Mobile', description: 'App em React Native/Expo para acesso em qualquer lugar.' },
  { icon: Sparkles, title: 'IA integrada', description: 'Copiloto com IA para consultas e insights do negócio.' },
]

export function BenefitsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">Tudo que seu negócio precisa</h2>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Uma plataforma única para vender, controlar estoque e crescer com dados.
        </p>
      </FadeIn>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, i) => (
          <FadeIn key={b.title} delay={i * 0.05}>
            <div className="group h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
                <b.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{b.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{b.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
