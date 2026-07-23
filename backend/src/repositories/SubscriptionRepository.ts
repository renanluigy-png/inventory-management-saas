import { Prisma, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/database';

export class SubscriptionRepository {
  async findByCompanyId(companyId: string) {
    return prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });
  }

  async findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, company: true },
    });
  }

  async create(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({
      data,
      include: { plan: true },
    });
  }

  async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  async updateByCompanyId(companyId: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({
      where: { companyId },
      data,
      include: { plan: true },
    });
  }

  async findExpiredTrials() {
    return prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { lt: new Date() },
      },
      include: { company: true },
    });
  }

  async findExpiredSubscriptions() {
    return prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ATIVA, SubscriptionStatus.PENDENTE] },
        currentPeriodEnd: { lt: new Date() },
      },
      include: { company: true },
    });
  }

  async aggregateRevenue() {
    const result = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ATIVA },
      include: { plan: true },
    });

    const mrr = result.reduce((acc, sub) => {
      return acc + Number(sub.plan.precoMensal);
    }, 0);

    return { mrr, arr: mrr * 12, count: result.length };
  }

  async countByStatus() {
    const groups = await prisma.subscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return groups.reduce(
      (acc, g) => ({ ...acc, [g.status]: g._count._all }),
      {} as Record<string, number>
    );
  }
}
