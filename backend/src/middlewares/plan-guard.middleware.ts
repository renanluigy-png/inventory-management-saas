import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { appCache, CacheKeys, TTL_SECONDS } from '../utils/cache';
import { prisma } from '../config/database';

type ResourceType = 'usuarios' | 'produtos' | 'clientes' | 'vendasMes' | 'storageMb';

interface UsageCounts {
  usuarios: number;
  produtos: number;
  clientes: number;
  vendasMes: number;
  storageMb: number;
}

interface PlanLimits {
  limiteUsuarios: number;
  limiteProdutos: number;
  limiteClientes: number;
  limiteVendasMes: number;
  limiteStorageMb: number;
  modulos: string[];
}

async function getUsage(companyId: string): Promise<UsageCounts> {
  const cached = appCache.get<UsageCounts>(CacheKeys.USAGE(companyId));
  if (cached) return cached;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [usuarios, produtos, clientes, vendasMes, storage] = await Promise.all([
    prisma.user.count({ where: { companyId, ativo: true } }),
    prisma.product.count({ where: { companyId, ativo: true } }),
    prisma.customer.count({ where: { companyId, ativo: true } }),
    prisma.sale.count({ where: { companyId, status: 'FINALIZADA', createdAt: { gte: startOfMonth } } }),
    prisma.fileUpload.aggregate({ where: { companyId }, _sum: { tamanhoBytes: true } }),
  ]);

  const usage: UsageCounts = {
    usuarios,
    produtos,
    clientes,
    vendasMes,
    storageMb: Math.round((storage._sum.tamanhoBytes ?? 0) / (1024 * 1024)),
  };

  appCache.set(CacheKeys.USAGE(companyId), usage, TTL_SECONDS.USAGE);
  return usage;
}

async function getLimits(companyId: string): Promise<PlanLimits | null> {
  const cached = appCache.get<PlanLimits>(CacheKeys.PLAN_LIMITS(companyId));
  if (cached) return cached;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });

  if (!subscription) return null;

  const limits: PlanLimits = {
    limiteUsuarios: subscription.plan.limiteUsuarios,
    limiteProdutos: subscription.plan.limiteProdutos,
    limiteClientes: subscription.plan.limiteClientes,
    limiteVendasMes: subscription.plan.limiteVendasMes,
    limiteStorageMb: subscription.plan.limiteStorageMb,
    modulos: subscription.plan.modulos,
  };

  appCache.set(CacheKeys.PLAN_LIMITS(companyId), limits, TTL_SECONDS.PLAN_LIMITS);
  return limits;
}

const resourceLabels: Record<ResourceType, string> = {
  usuarios: 'usuários',
  produtos: 'produtos',
  clientes: 'clientes',
  vendasMes: 'vendas mensais',
  storageMb: 'MB de armazenamento',
};

const limitKeys: Record<ResourceType, keyof PlanLimits> = {
  usuarios: 'limiteUsuarios',
  produtos: 'limiteProdutos',
  clientes: 'limiteClientes',
  vendasMes: 'limiteVendasMes',
  storageMb: 'limiteStorageMb',
};

/**
 * planGuard(resource) — middleware que bloqueia operações acima do limite do plano.
 *
 * Uso:
 *   router.post('/', planGuard('produtos'), asyncHandler(ctrl.create));
 */
export function planGuard(resource: ResourceType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // MASTER e usuários sem companyId ignoram o guard
    if (!req.companyId || req.user?.role === 'MASTER') {
      return next();
    }

    const [usage, limits] = await Promise.all([
      getUsage(req.companyId),
      getLimits(req.companyId),
    ]);

    if (!limits) return next(); // sem assinatura = tenant middleware já tratou

    const current = usage[resource];
    const limit = limits[limitKeys[resource]] as number;

    if (current >= limit) {
      return next(
        new AppError(
          `Limite do plano atingido: ${current}/${limit} ${resourceLabels[resource]}. Faça upgrade para continuar.`,
          402
        )
      );
    }

    next();
  };
}

/**
 * requireModule(moduleName) — valida se o módulo está habilitado no plano.
 */
export function requireModule(moduleName: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.companyId || req.user?.role === 'MASTER') {
      return next();
    }

    const limits = await getLimits(req.companyId);
    if (!limits) return next();

    if (!limits.modulos.includes(moduleName)) {
      return next(
        new AppError(
          `O módulo "${moduleName}" não está disponível no seu plano atual. Faça upgrade para acessar.`,
          402
        )
      );
    }

    next();
  };
}
