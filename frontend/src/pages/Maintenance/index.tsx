import { Construction, RefreshCw } from 'lucide-react'

export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Construction className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Em Manutenção
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          O sistema está temporariamente indisponível para manutenção programada.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          Voltaremos em breve. Pedimos desculpas pelo inconveniente.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Verificar novamente
        </button>

        <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
          Controle de Estoque — Sistema ERP
        </p>
      </div>
    </div>
  )
}
