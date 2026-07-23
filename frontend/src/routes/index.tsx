import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import MasterLayout from '../layouts/MasterLayout'
import PrivateRoute from '../components/shared/PrivateRoute'
import { Loading } from '../components/ui/Loading'

const Login          = lazy(() => import('../pages/Login'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('../pages/ResetPassword'))
const Dashboard      = lazy(() => import('../pages/Dashboard'))
const Products       = lazy(() => import('../pages/Products'))
const Categories     = lazy(() => import('../pages/Categories'))
const Customers      = lazy(() => import('../pages/Customers'))
const Sales          = lazy(() => import('../pages/Sales'))
const Stock          = lazy(() => import('../pages/Stock'))
const Reports        = lazy(() => import('../pages/Reports'))
const Settings       = lazy(() => import('../pages/Settings'))
const Audit          = lazy(() => import('../pages/Audit'))
const Users          = lazy(() => import('../pages/Users'))
const Promotions     = lazy(() => import('../pages/Promotions'))
const Metas          = lazy(() => import('../pages/Metas'))
const Agenda         = lazy(() => import('../pages/Agenda'))
const Favoritos      = lazy(() => import('../pages/Favoritos'))
const Monitor        = lazy(() => import('../pages/Monitor'))
const TechLogs       = lazy(() => import('../pages/TechLogs'))
const AIPage         = lazy(() => import('../pages/AI'))
const NotFound       = lazy(() => import('../pages/NotFound'))

// Master Panel
const MasterDashboard  = lazy(() => import('../pages/Master/Dashboard'))
const MasterCompanies  = lazy(() => import('../pages/Master/Companies'))
const MasterAudit      = lazy(() => import('../pages/Master/Audit'))
const MasterUsers      = lazy(() => import('../pages/Master/Users'))
const MasterMonitor    = lazy(() => import('../pages/Master/Monitor'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading fullscreen text="Carregando..." />}>
      <Routes>
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
            <Route path="/"           element={<Dashboard />} />
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
