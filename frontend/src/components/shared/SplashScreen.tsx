import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 1400)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-900 transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
          <Package className="h-9 w-9 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Controle Estoque</h1>
          <p className="mt-1 text-sm text-gray-400">ERP Completo</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
