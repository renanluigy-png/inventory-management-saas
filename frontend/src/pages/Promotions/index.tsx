import { useState } from 'react'
import { Gift, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../utils/format'

interface Promotion {
  id: string
  nome: string
  desconto: number
  tipo: 'PERCENTUAL' | 'FIXO'
  dataInicio: string
  dataFim: string
  ativa: boolean
}

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promoções</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie descontos e ofertas especiais</p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Nova Promoção</Button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8">
        <EmptyState
          icon={Gift}
          title="Nenhuma promoção ativa"
          description="Crie promoções com descontos percentuais ou fixos para seus produtos"
          action={<Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>Nova Promoção</Button>}
        />
      </div>

      {modalOpen && (
        <Modal title="Nova Promoção" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                O módulo de promoções requer configuração adicional da API. Esta funcionalidade estará disponível na próxima versão.
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
