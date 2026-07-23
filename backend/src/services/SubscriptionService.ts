import { PlanoTier, SubscriptionStatus } from '@prisma/client';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { PlanRepository } from '../repositories/PlanRepository';
import { AppError } from '../utils/AppError';
import { appCache, CacheKeys, TTL_SECONDS, invalidateCompanyCache } from '../utils/cache';
import { env } from '../config/env';

export class SubscriptionService {
  private subscriptionRepo: SubscriptionRepository;
  private planRepo: PlanRepository;

  constructor() {
    this.subscriptionRepo = new SubscriptionRepository();
    this.planRepo = new PlanRepository();
  }

  async findByCompanyId(companyId: string) {
    const cached = appCache.get(CacheKeys.SUBSCRIPTION(companyId));
    if (cached) return cached;

    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);

    appCache.set(CacheKeys.SUBSCRIPTION(companyId), sub, TTL_SECONDS.SUBSCRIPTION);
    return sub;
  }

  async createTrial(companyId: string, planTier: PlanoTier = PlanoTier.STARTER) {
    const plan = await this.planRepo.findByTier(planTier);
    if (!plan) throw new AppError('Plano não encontrado.', 404);

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + env.SAAS_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.subscriptionRepo.create({
      company: { connect: { id: companyId } },
      plan: { connect: { id: plan.id } },
      status: SubscriptionStatus.TRIAL,
      trialEndsAt,
      currentPeriodEnd,
    });
  }

  async activate(companyId: string) {
    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);

    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await this.subscriptionRepo.updateByCompanyId(companyId, {
      status: SubscriptionStatus.ATIVA,
      currentPeriodStart: now,
      currentPeriodEnd,
      suspendedAt: null,
    });

    invalidateCompanyCache(companyId);
    return updated;
  }

  async suspend(companyId: string) {
    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);

    const updated = await this.subscriptionRepo.updateByCompanyId(companyId, {
      status: SubscriptionStatus.SUSPENSA,
      suspendedAt: new Date(),
    });

    invalidateCompanyCache(companyId);
    return updated;
  }

  async cancel(companyId: string) {
    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);

    const updated = await this.subscriptionRepo.updateByCompanyId(companyId, {
      status: SubscriptionStatus.CANCELADA,
      canceledAt: new Date(),
      renovacaoAuto: false,
    });

    invalidateCompanyCache(companyId);
    return updated;
  }

  async changePlan(companyId: string, planTier: string) {
    const tierEnum = planTier.toUpperCase() as PlanoTier;
    if (!Object.values(PlanoTier).includes(tierEnum)) {
      throw new AppError('Tier de plano inválido.', 400);
    }

    const plan = await this.planRepo.findByTier(tierEnum);
    if (!plan) throw new AppError('Plano não encontrado.', 404);

    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);

    const updated = await this.subscriptionRepo.updateByCompanyId(companyId, {
      plan: { connect: { id: plan.id } },
    });

    invalidateCompanyCache(companyId);
    return updated;
  }

  async renew(companyId: string) {
    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) throw new AppError('Assinatura não encontrada.', 404);
    if (!sub.renovacaoAuto) throw new AppError('Renovação automática desativada.', 400);

    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await this.subscriptionRepo.updateByCompanyId(companyId, {
      status: SubscriptionStatus.ATIVA,
      currentPeriodStart: now,
      currentPeriodEnd,
    });

    invalidateCompanyCache(companyId);
    return updated;
  }

  /** Verifica e expira assinaturas em trial vencidas. Chamado por cron/scheduler. */
  async processExpiredTrials() {
    const expired = await this.subscriptionRepo.findExpiredTrials();
    const results = await Promise.allSettled(
      expired.map((sub) =>
        this.subscriptionRepo.update(sub.id, { status: SubscriptionStatus.EXPIRADA })
      )
    );
    return { processed: expired.length, results };
  }

  async getRevenueStats() {
    return this.subscriptionRepo.aggregateRevenue();
  }

  async getStatusCounts() {
    return this.subscriptionRepo.countByStatus();
  }

  async isAccessible(companyId: string): Promise<boolean> {
    const sub = await this.subscriptionRepo.findByCompanyId(companyId);
    if (!sub) return false;
    const accessible: string[] = [SubscriptionStatus.ATIVA, SubscriptionStatus.TRIAL];
    return accessible.includes(sub.status);
  }
}
