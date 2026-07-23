import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, ShoppingCart, Users, BarChart2, Tag, Gift,
  CheckCircle2, ArrowRight, X, Sparkles,
} from 'lucide-react'
import { Button } from '../ui/Button'

const STEPS = [
  {
    icon: Package,
    color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    title: 'Bem-vindo ao Controle Estoque!',
    description: 'Seu ERP completo para gerenciar vendas, estoque, clientes e muito mais. Vamos fazer um tour rápido para você começar a usar.',
    action: null,
  },
  {
    icon: Tag,
    color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    title: 'Crie suas categorias',
    description: 'Organize seus produtos em categorias para facilitar a navegação e gerar relatórios mais precisos. Comece criando as categorias do seu negócio.',
    action: { label: 'Ir para Categorias', path: '/categories' },
  },
  {
    icon: Package,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    title: 'Cadastre seus produtos',
    description: 'Adicione seus produtos com preço, custo, estoque mínimo e imagem. O sistema vai alertar quando o estoque estiver crítico.',
    action: { label: 'Ir para Produtos', path: '/products' },
  },
  {
    icon: Users,
    color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    title: 'Cadastre seus clientes',
    description: 'Mantenha um cadastro de clientes para acompanhar compras, fiado e histórico. Você pode adicionar CPF, telefone e endereço.',
    action: { label: 'Ir para Clientes', path: '/customers' },
  },
  {
    icon: ShoppingCart,
    color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    title: 'Realize sua primeira venda',
    description: 'Use o PDV (Ponto de Venda) para registrar vendas rapidamente. Selecione produtos, cliente, forma de pagamento e finalize.',
    action: { label: 'Abrir PDV', path: '/sales' },
  },
  {
    icon: Gift,
    color: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
    title: 'Crie promoções',
    description: 'Atraia mais clientes com descontos por percentual, valor fixo ou preço especial. Configure períodos e limite por cliente.',
    action: { label: 'Ver Promoções', path: '/promotions' },
  },
  {
    icon: BarChart2,
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    title: 'Acompanhe seus relatórios',
    description: 'Visualize métricas de vendas, estoque parado, clientes recorrentes, fluxo de caixa e muito mais nos relatórios.',
    action: { label: 'Ver Relatórios', path: '/reports' },
  },
  {
    icon: Sparkles,
    color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
    title: 'Use o Copiloto IA',
    description: 'Pergunte ao Copiloto IA qualquer coisa sobre seu negócio em linguagem natural. Ex: "Quais produtos venderam mais esta semana?"',
    action: { label: 'Conhecer o Copiloto', path: '/ia' },
  },
]

const STORAGE_KEY = 'onboarding_completed'

interface OnboardingWizardProps {
  onClose: () => void
}

export function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1')
    localStorage.removeItem('onboarding_pending')
    onClose()
  }

  function handleNext() {
    if (isLast) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleAction() {
    handleClose()
    if (current.action) navigate(current.action.path)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5 px-6 pt-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${i === step ? 'w-6 bg-indigo-600' : i < step ? 'w-3 bg-indigo-300 dark:bg-indigo-700' : 'w-3 bg-gray-200 dark:bg-gray-600'}`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-8 pb-6 text-center">
            <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${current.color}`}>
              <Icon className="h-8 w-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{current.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{current.description}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            {current.action && (
              <Button variant="outline" className="flex-1 text-sm" onClick={handleAction}>
                {current.action.label}
              </Button>
            )}
            <Button className="flex-1 text-sm" onClick={handleNext} rightIcon={isLast ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}>
              {isLast ? 'Começar!' : 'Próximo'}
            </Button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-gray-400 pb-4">{step + 1} de {STEPS.length}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function shouldShowOnboarding(): boolean {
  return (
    localStorage.getItem('onboarding_pending') === '1' &&
    !localStorage.getItem(STORAGE_KEY)
  )
}
