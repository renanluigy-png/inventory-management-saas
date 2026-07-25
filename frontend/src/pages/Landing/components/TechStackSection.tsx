import {
  Atom, Braces, Server, Route, Layers, Database, KeyRound, RefreshCw, Box,
  Palette, Smartphone, Workflow, Container,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FadeIn } from '../../../components/ui/FadeIn'

interface Tech {
  icon: LucideIcon
  name: string
  description: string
}

const techs: Tech[] = [
  { icon: Atom, name: 'React', description: 'Interface reativa e componentizada.' },
  { icon: Braces, name: 'TypeScript', description: 'Tipagem estática em todo o projeto.' },
  { icon: Server, name: 'Node.js', description: 'Runtime do backend REST.' },
  { icon: Route, name: 'Express', description: 'Framework HTTP da API.' },
  { icon: Layers, name: 'Prisma ORM', description: 'Modelagem e acesso a dados tipado.' },
  { icon: Database, name: 'PostgreSQL', description: 'Banco relacional de produção.' },
  { icon: KeyRound, name: 'JWT', description: 'Autenticação stateless por token.' },
  { icon: RefreshCw, name: 'React Query', description: 'Cache e sincronização de dados assíncronos.' },
  { icon: Box, name: 'Zustand', description: 'Gerenciamento de estado global.' },
  { icon: Container, name: 'Docker', description: 'Empacotamento e deploy consistente.' },
  { icon: Workflow, name: 'GitHub Actions', description: 'Pipeline de CI: lint, testes e build.' },
  { icon: Smartphone, name: 'Expo', description: 'App mobile em React Native.' },
  { icon: Palette, name: 'Tailwind CSS', description: 'Estilização utilitária e responsiva.' },
]

export function TechStackSection() {
  return (
    <section id="tecnologias" className="bg-gray-50 dark:bg-gray-900/60 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">Tecnologias</h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Stack moderna, tipada e testada de ponta a ponta.</p>
        </FadeIn>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {techs.map((t, i) => (
            <FadeIn key={t.name} delay={Math.min(i * 0.04, 0.3)}>
              <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                  <t.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
