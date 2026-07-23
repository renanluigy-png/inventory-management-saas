import { useAuthStore } from '../store/auth.store'
import type { Role } from '../types'

export function useAuth() {
  const { user, token, isAuthenticated, logout, setAuth, updateUser } = useAuthStore()

  function hasRole(...roles: Role[]): boolean {
    if (!user) return false
    return roles.includes(user.role)
  }

  function isAdmin() {
    return user?.role === 'ADMIN'
  }

  function isAdminOrGerente() {
    return user?.role === 'ADMIN' || user?.role === 'GERENTE'
  }

  return { user, token, isAuthenticated, logout, setAuth, updateUser, hasRole, isAdmin, isAdminOrGerente }
}
