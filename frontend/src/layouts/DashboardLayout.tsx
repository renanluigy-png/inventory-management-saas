import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Users, Boxes,
  BarChart2, Settings, Shield, UserCog, LogOut, Menu, X,
  Sun, Moon, Wallet, Gift, Target, Calendar, Star, Terminal, Activity, Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useThemeStore } from '../store/theme.store'
import { cn } from '../utils/cn'
import { getInitials } from '../utils/format'
import type { Role } from '../types'
import { NotificationBell } from '../components/shared/NotificationBell'
import { GlobalSearch } from '../components/shared/GlobalSearch'
import { ChatBot } from '../components/ai/ChatBot'
import { OnboardingWizard, shouldShowOnboarding } from '../components/shared/OnboardingWizard'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  roles?: Role[]
  end?: boolean
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', end: true },
  { icon: ShoppingCart, label: 'PDV / Vendas', path: '/sales' },
  { icon: Package, label: 'Produtos', path: '/products' },
  { icon: Tag, label: 'Categorias', path: '/categories' },
  { icon: Users, label: 'Clientes', path: '/customers' },
  { icon: Boxes, label: 'Estoque', path: '/stock' },
  { icon: Gift, label: 'Promoções', path: '/promotions' },
  { icon: Wallet, label: 'Caixa', path: '/caixa' },
  { icon: BarChart2, label: 'Relatórios', path: '/reports' },
]

const extraNav: NavItem[] = [
  { icon: Target, label: 'Metas', path: '/metas' },
  { icon: Calendar, label: 'Agenda', path: '/agenda' },
  { icon: Star, label: 'Favoritos', path: '/favoritos' },
  { icon: Sparkles, label: 'Copiloto IA', path: '/ia' },
]

const adminNav: NavItem[] = [
  { icon: UserCog, label: 'Usuários', path: '/users', roles: ['ADMIN', 'GERENTE'] },
  { icon: Settings, label: 'Configurações', path: '/settings', roles: ['ADMIN'] },
  { icon: Shield, label: 'Auditoria', path: '/audit', roles: ['ADMIN'] },
  { icon: Activity, label: 'Monitor', path: '/monitor', roles: ['ADMIN', 'GERENTE'] },
  { icon: Terminal, label: 'Logs Técnicos', path: '/techlogs', roles: ['ADMIN'] },
]

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function ImpersonationBanner() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const backup = sessionStorage.getItem('master_backup')
  if (!backup) return null

  function exitImpersonation() {
    try {
      const { token, user } = JSON.parse(backup as string)
      sessionStorage.removeItem('master_backup')
      setAuth(token, user, undefined)
      navigate('/master')
    } catch {
      sessionStorage.removeItem('master_backup')
      navigate('/login')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-violet-600 dark:bg-violet-700 px-4 py-2 text-sm text-white flex-shrink-0">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 flex-shrink-0" />
        <span>Você está acessando esta empresa como <strong>Master</strong>.</span>
      </div>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 px-3 py-1 text-xs font-medium transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao Master
      </button>
    </div>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, sidebarOpen, toggleSidebar, setSidebarOpen } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding())

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Close mobile on resize
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setMobileOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const visibleAdmin = adminNav.filter((n) => !n.roles || (user && n.roles.includes(user.role)))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      mobile ? 'w-64' : sidebarOpen ? 'w-64' : 'w-16'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0', !sidebarOpen && !mobile && 'justify-center')}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <Package className="h-5 w-5 text-white" />
        </div>
        {(sidebarOpen || mobile) && (
          <span className="ml-3 text-sm font-bold text-gray-900 dark:text-white truncate">Controle Estoque</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNav.map((item) => (
          <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !mobile} />
        ))}

        <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
        {extraNav.map((item) => (
          <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !mobile} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
            {visibleAdmin.map((item) => (
              <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !mobile} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className={cn('border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0', !sidebarOpen && !mobile && 'px-2')}>
        <div className={cn('flex items-center gap-3 rounded-lg p-2', !sidebarOpen && !mobile && 'justify-center')}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            {getInitials(user?.nome ?? 'U')}
          </div>
          {(sidebarOpen || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.nome}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            'mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors',
            !sidebarOpen && !mobile && 'justify-center'
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(sidebarOpen || mobile) && 'Sair'}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full lg:hidden"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
          <button
            onClick={() => { if (window.innerWidth < 1024) setMobileOpen(true); else toggleSidebar() }}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex-1 hidden lg:block">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <NotificationBell />

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              {getInitials(user?.nome ?? 'U')}
            </div>
          </div>
        </header>

          {/* Banner de impersonação */}
        <ImpersonationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating AI Chat — available on all screens */}
      <ChatBot />

      {/* Onboarding wizard — shown once after company registration */}
      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
    </div>
  )
}
