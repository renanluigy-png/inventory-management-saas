import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Shield, LogOut, Menu, X,
  Sun, Moon, Users, Activity, Settings, FileText, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useThemeStore } from '../store/theme.store'
import { cn } from '../utils/cn'
import { getInitials } from '../utils/format'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  end?: boolean
}

const nav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/master',          end: true },
  { icon: Building2,       label: 'Empresas',   path: '/master/companies'           },
  { icon: Users,           label: 'Usuários',   path: '/master/users'               },
  { icon: Activity,        label: 'Monitor',    path: '/master/monitor'             },
  { icon: FileText,        label: 'Auditoria',  path: '/master/audit'               },
  { icon: Settings,        label: 'Configurações', path: '/master/settings'         },
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
            ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export default function MasterLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setMobileOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

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
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0',
        !sidebarOpen && !mobile && 'justify-center'
      )}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        {(sidebarOpen || mobile) && (
          <div className="ml-3 min-w-0">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">Master Panel</span>
            <span className="text-xs text-violet-500 dark:text-violet-400">Controle Estoque SaaS</span>
          </div>
        )}
      </div>

      {/* Badge MASTER */}
      {(sidebarOpen || mobile) && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 px-3 py-2">
          <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Super Administrador</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
        {nav.map((item) => (
          <SidebarLink key={item.path} item={item} collapsed={!sidebarOpen && !mobile} />
        ))}
      </nav>

      {/* User + logout */}
      <div className={cn('border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0', !sidebarOpen && !mobile && 'px-2')}>
        <div className={cn('flex items-center gap-3 rounded-lg p-2', !sidebarOpen && !mobile && 'justify-center')}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs font-bold">
            {getInitials(user?.nome ?? 'M')}
          </div>
          {(sidebarOpen || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.nome}</p>
              <p className="text-xs text-violet-500 truncate">{user?.email}</p>
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

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
          <button
            onClick={() => { if (window.innerWidth < 1024) setMobileOpen(true); else toggleSidebar() }}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4 text-violet-500" />
              <span>Painel Master</span>
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs font-bold">
              {getInitials(user?.nome ?? 'M')}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
