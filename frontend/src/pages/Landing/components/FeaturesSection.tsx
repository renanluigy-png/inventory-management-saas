import {
  Package, Tag, Users, Truck, ShoppingCart, Boxes, LayoutDashboard, FileSearch,
  UserCog, Building2, DatabaseBackup, Webhook, Smartphone, Sparkles, QrCode,
  MessageCircle, Lock, FileBarChart2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FadeIn } from '../../../components/ui/FadeIn'

interface Feature {
  icon: LucideIcon
  label: string
}

const features: Feature[] = [
  { icon: Package, label: 'Produtos' },
  { icon: Tag, label: 'Categorias' },
  { icon: Boxes, label: 'Estoque' },
  { icon: Users, label: 'Clientes' },
  { icon: Truck, label: 'Fornecedores' },
  { icon: ShoppingCart, label: 'Vendas' },
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: FileSearch, label: 'Auditoria' },
  { icon: Building2, label: 'Multiempresa' },
  { icon: UserCog, label: 'Usuários' },
  { icon: Webhook, label: 'API REST' },
  { icon: Smartphone, label: 'Mobile' },
  { icon: Sparkles, label: 'IA' },
  { icon: QrCode, label: 'PIX' },
  { icon: MessageCircle, label: 'WhatsApp' },
  { icon: DatabaseBackup, label: 'Backup' },
  { icon: Lock, label: 'JWT' },
  { icon: FileBarChart2, label: 'Relatórios' },
]

export function FeaturesSection() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-4 py-20">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">Recursos</h2>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Um ERP completo, dos cadastros básicos à inteligência artificial.
        </p>
      </FadeIn>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {features.map((f, i) => (
          <FadeIn key={f.label} delay={Math.min(i * 0.03, 0.3)}>
            <div className="flex h-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 transition-colors hover:border-indigo-200 dark:hover:border-indigo-800">
              <f.icon className="h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium leading-snug text-gray-700 dark:text-gray-200">{f.label}</span>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
