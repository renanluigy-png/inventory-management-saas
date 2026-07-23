import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open?: boolean
  onClose?: () => void
  onCancel?: () => void
  onConfirm: () => void
  title?: string
  message?: string
  description?: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open = true,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirmar ação',
  message,
  description,
  confirmLabel = 'Confirmar',
  confirmVariant = 'danger',
  loading,
}: ConfirmDialogProps) {
  const handleClose = onClose ?? onCancel ?? (() => {})
  const text = message ?? description ?? 'Tem certeza que deseja continuar? Esta ação não pode ser desfeita.'

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
