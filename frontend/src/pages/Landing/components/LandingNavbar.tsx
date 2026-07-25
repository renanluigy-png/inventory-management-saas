import { useNavigate } from 'react-router-dom'
import { Package, Github, Sun, Moon } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useThemeStore } from '../../../store/theme.store'
import { GITHUB_URL } from '../constants'

const navLinks = [
  { href: '#demo', label: 'Demo' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#tecnologias', label: 'Tecnologias' },
]

export function LandingNavbar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()

  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">Controle Estoque</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Ver código no GitHub"
            aria-label="Ver código no GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <Button size="sm" className="ml-1" onClick={() => navigate('/login')}>
            Entrar
          </Button>
        </div>
      </nav>
    </header>
  )
}
