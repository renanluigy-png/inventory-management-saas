import { Layers, Building2, Workflow, Smartphone, Webhook } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FadeIn } from '../../../components/ui/FadeIn'

interface Stat {
  value: string
  label: string
}

interface Capability {
  icon: LucideIcon
  label: string
}

const stats: Stat[] = [
  { value: '+50', label: 'Telas' },
  { value: '+300', label: 'Componentes' },
  { value: '+40 mil', label: 'Linhas de código (aprox.)' },
]

const capabilities: Capability[] = [
  { icon: Layers, label: 'Backend + Frontend' },
  { icon: Building2, label: 'Sistema Multiempresa' },
  { icon: Workflow, label: 'CI/CD com GitHub Actions' },
  { icon: Smartphone, label: 'Aplicação Mobile' },
  { icon: Webhook, label: 'API REST' },
]

export function StatsSection() {
  return (
    <section className="bg-indigo-600 dark:bg-indigo-950 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Sobre o Projeto</h2>
          <p className="mt-3 text-indigo-100">Um sistema robusto, construído com atenção a cada detalhe.</p>
        </FadeIn>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
                <p className="text-4xl font-extrabold text-white sm:text-5xl">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-indigo-100">{s.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {capabilities.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white"
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </span>
          ))}
        </FadeIn>
      </div>
    </section>
  )
}
