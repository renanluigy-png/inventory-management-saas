import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { appCache, CacheKeys, TTL_SECONDS } from '../utils/cache';
import { prisma } from '../config/database';

declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
  }
}

interface CachedSubscription {
  status: string;
  companyAtivo: boolean;
}

/**
 * tenantMiddleware — Etapa 14 (Multi-tenant completo)
 *
 * Responsabilidades:
 *   1. Extrai o companyId do JWT (req.user.companyId)
 *   2. Para MASTER: permite acesso irrestrito
 *   3. Para demais usuários: valida que a empresa está ativa e a assinatura acessível
 *   4. Define req.companyId para uso em todo o pipeline
 */
export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Rotas sem autenticação (req.user não existe)
  if (!req.user) {
    return next();
  }

  const { role, companyId } = req.user;

  // MASTER: acesso irrestrito a qualquer empresa
  if (role === 'MASTER') {
    // MASTER pode operar em nome de uma empresa usando o header X-Company-Id
    const overrideCompany = req.headers['x-company-id'] as string | undefined;
    req.companyId = overrideCompany ?? undefined;
    req.tenantId = overrideCompany ?? 'platform';
    return next();
  }

  // Usuário sem empresa vinculada (não é MASTER)
  if (!companyId) {
    return next(new AppError('Usuário não vinculado a nenhuma empresa.', 403));
  }

  // Cache da assinatura da empresa para evitar hit no banco em cada requisição
  const cacheKey = CacheKeys.SUBSCRIPTION(companyId);
  let cached = appCache.get<CachedSubscription>(cacheKey);

  if (!cached) {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      select: { status: true, company: { select: { ativo: true } } },
    });

    if (!subscription) {
      return next(new AppError('Empresa sem assinatura. Contate o suporte.', 403));
    }

    cached = {
      status: subscription.status,
      companyAtivo: subscription.company.ativo,
    };

    appCache.set(cacheKey, cached, TTL_SECONDS.SUBSCRIPTION);
  }

  if (!cached.companyAtivo) {
    return next(new AppError('Empresa suspensa. Contate o suporte.', 403));
  }

  const acessiveis = ['ATIVA', 'TRIAL'];
  if (!acessiveis.includes(cached.status)) {
    return next(
      new AppError(
        `Assinatura ${cached.status.toLowerCase()}. Renove ou contate o suporte.`,
        402
      )
    );
  }

  req.companyId = companyId;
  req.tenantId = companyId;
  next();
}
