import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <h1 className="text-8xl font-black text-indigo-200 dark:text-indigo-900 select-none">404</h1>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Página não encontrada</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">A página que você está procurando não existe ou foi movida.</p>
        <div className="mt-6">
          <Button onClick={() => navigate('/')} leftIcon={<Home className="h-4 w-4" />}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  )
}
