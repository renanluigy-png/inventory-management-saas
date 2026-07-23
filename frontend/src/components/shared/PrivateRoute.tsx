import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import type { Role } from '../../types'

interface PrivateRouteProps {
  roles?: Role[]
}

export default function PrivateRoute({ roles }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    // MASTER gets their own panel; others go to dashboard
    return <Navigate to={user.role === 'MASTER' ? '/master' : '/'} replace />
  }

  return <Outlet />
}
