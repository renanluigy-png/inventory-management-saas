import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import MasterLayout from '../layouts/MasterLayout'
import PrivateRoute from '../components/shared/PrivateRoute'
import { Loading } from '../components/ui/Loading'

const CHUNK_RELOAD_KEY = 'cde-lazy-chunk-reload-at'

function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importer()

      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      } catch {
        // noop
      }

      return module
    } catch (error) {
      // Publicações de SPA em GitHub Pages podem deixar o navegador com HTML
      // antigo apontando para um chunk hash que acabou de ser substituído.
      // Uma única navegação para a raiz com query nova força o HTML atualizado.
      try {
        const attemptedAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
        const recentlyRetried = Date.now() - attemptedAt < 30_000

        if (!recentlyRetried) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
          const baseUrl = import.meta.env.BASE_URL
          const separator = baseUrl.includes('?') ? '&' : '?'
          window.location.replace(baseUrl + separator + 'chunkReload=' + Date.now())
        }
      } catch {
        // sessionStorage pode estar indisponível em alguns modos do navegador.
      }

      throw error
    }
  })
}

const Landing        = lazyWithRetry(() => import('../pages/Landing'))
const Login          = lazyWithRetry(() => import('../pages/Login'))
const ForgotPassword = lazyWithRetry(() => import('../pages/ForgotPassword'))
const ResetPassword  = lazyWithRetry(() => import('../pages/ResetPassword'))
const Dashboard      = lazyWithRetry(() => import('../pages/Dashboard'))
const Products       = lazyWithRetry(() => import('../pages/Products'))
const Categories     = lazyWithRetry(() => import('../pages/Categories'))
const Customers      = lazyWithRetry(() => import('../pages/Customers'))
const Sales          = lazyWithRetry(() => import('../pages/Sales'))
const Stock          = lazyWithRetry(() => import('../pages/Stock'))
const Reports        = lazyWithRetry(() => import('../pages/Reports'))
const Settings       = lazyWithRetry(() => import('../pages/Settings'))
const Audit          = lazyWithRetry(() => import('../pages/Audit'))
const Users          = lazyWithRetry(() => import('../pages/Users'))
const Promotions     = lazyWithRetry(() => import('../pages/Promotions'))
const Metas          = lazyWithRetry(() => import('../pages/Metas'))
const Agenda         = lazyWithRetry(() => import('../pages/Agenda'))
const Favoritos      = lazyWithRetry(() => import('../pages/Favoritos'))
const Monitor        = lazyWithRetry(() => import('../pages/Monitor'))
const TechLogs       = lazyWithRetry(() => import('../pages/TechLogs'))
const AIPage         = lazyWithRetry(() => import('../pages/AI'))
const NotFound       = lazyWithRetry(() => import('../pages/NotFound'))

// Master Panel
const MasterDashboard  = lazyWithRetry(() => import('../pages/Master/Dashboard'))
const MasterCompanies  = lazyWithRetry(() => import('../pages/Master/Companies'))
const MasterAudit      = lazyWithRetry(() => import('../pages/Master/Audit'))
const MasterUsers      = lazyWithRetry(() => import('../pages/Master/Users'))
const MasterMonitor    = lazyWithRetry(() => import('../pages/Master/Monitor'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading fullscreen text="Carregando..." />}>
      <Routes>
        {/* Landing pública */}
        <Route path="/" element={<Landing />} />

        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login"           element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
        </Route>

        {/* Master Panel — MASTER role only */}
        <Route element={<PrivateRoute roles={['MASTER']} />}>
          <Route element={<MasterLayout />}>
            <Route path="/master"           element={<MasterDashboard />} />
            <Route path="/master/companies" element={<MasterCompanies />} />
            <Route path="/master/audit"     element={<MasterAudit />} />
            <Route path="/master/users"     element={<MasterUsers />} />
            <Route path="/master/monitor"   element={<MasterMonitor />} />
            <Route path="/master/settings"  element={<MasterDashboard />} />
          </Route>
        </Route>

        {/* Protected — all authenticated users except MASTER */}
        <Route element={<PrivateRoute roles={['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/sales"      element={<Sales />} />
            <Route path="/products"   element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/customers"  element={<Customers />} />
            <Route path="/stock"      element={<Stock />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/caixa"      element={<Stock />} />
            <Route path="/reports"    element={<Reports />} />
            <Route path="/metas"      element={<Metas />} />
            <Route path="/agenda"     element={<Agenda />} />
            <Route path="/favoritos"  element={<Favoritos />} />
            <Route path="/ia"         element={<AIPage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<PrivateRoute roles={['ADMIN', 'GERENTE']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/users"   element={<Users />} />
            <Route path="/monitor" element={<Monitor />} />
          </Route>
        </Route>
        <Route element={<PrivateRoute roles={['ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/audit"    element={<Audit />} />
            <Route path="/techlogs" element={<TechLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
