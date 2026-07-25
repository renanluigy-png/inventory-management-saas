import { motion } from 'framer-motion'
import { Github, Package, Rocket } from 'lucide-react'
import { buttonClasses } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { GITHUB_URL } from '../constants'

const trustBadges = ['TypeScript', 'Testes automatizados', 'CI/CD', 'Docker-ready']

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-gray-900 dark:to-gray-900" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          <Package className="h-3.5 w-3.5" />
          Controle Estoque
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl"
        >
          ERP SaaS para Gestão de Estoque e Empresas
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-300"
        >
          Plataforma completa para controle de estoque, vendas, clientes, fornecedores, dashboard
          inteligente, auditoria e gestão multiempresa.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a href="#demo" className={buttonClasses('primary', 'lg')}>
            <Rocket className="h-4 w-4" />
            Testar Demonstração
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('outline', 'lg')}
          >
            <Github className="h-4 w-4" />
            Ver Código no GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {trustBadges.map((label) => (
            <Badge key={label} variant="info">
              {label}
            </Badge>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
