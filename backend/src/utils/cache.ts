import NodeCache from 'node-cache';

// Singleton de cache em memória compartilhado por toda a aplicação.
// TTL padrão: 5 minutos. Verificação de expiração a cada 120s.
export const appCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  useClones: false,
});

// Chaves pré-definidas para facilitar invalidação por módulo
export const CacheKeys = {
  DASHBOARD_METRICS: 'dashboard:metrics',
  CATEGORIES_ALL: 'categories:all',
  SETTINGS: 'system:settings',
  TOP_PRODUCTS: (limit: number) => `dashboard:top-products:${limit}`,
  SALES_CHART: (period: string) => `dashboard:sales-chart:${period}`,
  // SaaS / Multi-tenant
  COMPANY_CONTEXT: (companyId: string) => `company:context:${companyId}`,
  PLAN_LIMITS: (companyId: string) => `company:plan:${companyId}`,
  SUBSCRIPTION: (companyId: string) => `company:subscription:${companyId}`,
  USAGE: (companyId: string) => `company:usage:${companyId}`,
  PLATFORM_STATS: 'platform:stats',
} as const;

// TTLs específicos (segundos) para os contextos SaaS
export const TTL_SECONDS = {
  COMPANY_CONTEXT: 300,      // 5 min
  PLAN_LIMITS: 600,          // 10 min
  SUBSCRIPTION: 120,         // 2 min — verificado com frequência para bloqueios
  USAGE: 30,                 // 30 s — contagens de uso em tempo quase real
  PLATFORM_STATS: 60,        // 1 min — dashboard master
} as const;

/** Invalida todos os dados em cache de uma empresa específica. */
export function invalidateCompanyCache(companyId: string): void {
  appCache.del([
    CacheKeys.COMPANY_CONTEXT(companyId),
    CacheKeys.PLAN_LIMITS(companyId),
    CacheKeys.SUBSCRIPTION(companyId),
    CacheKeys.USAGE(companyId),
  ]);
}
