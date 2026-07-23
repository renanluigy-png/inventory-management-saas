import { useAuthStore } from '../store/auth.store'
import type { Role } from '../types'

export function usePermissions() {
  const user = useAuthStore((s) => s.user)

  const can = {
    manageUsers: () => user?.role === 'ADMIN',
    manageSettings: () => user?.role === 'ADMIN',
    viewAudit: () => user?.role === 'ADMIN',
    manageBackup: () => user?.role === 'ADMIN',
    manageSales: () => ['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'].includes(user?.role ?? ''),
    cancelSales: () => ['ADMIN', 'GERENTE'].includes(user?.role ?? ''),
    manageProducts: () => ['ADMIN', 'GERENTE'].includes(user?.role ?? ''),
    viewReports: () => ['ADMIN', 'GERENTE'].includes(user?.role ?? ''),
    manageStock: () => ['ADMIN', 'GERENTE', 'FUNCIONARIO'].includes(user?.role ?? ''),
    hasRole: (...roles: Role[]) => roles.includes(user?.role as Role),
  }

  return can
}
