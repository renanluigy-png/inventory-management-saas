import { Prisma, PlanoTier } from '@prisma/client';
import { prisma } from '../config/database';

export class PlanRepository {
  async findAll() {
    return prisma.plan.findMany({
      where: { ativo: true },
      orderBy: { precoMensal: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.plan.findUnique({ where: { id } });
  }

  async findByTier(tier: PlanoTier) {
    return prisma.plan.findUnique({ where: { tier } });
  }

  async upsertByTier(tier: PlanoTier, data: Prisma.PlanCreateInput) {
    return prisma.plan.upsert({
      where: { tier },
      update: data,
      create: data,
    });
  }

  async update(id: string, data: Prisma.PlanUpdateInput) {
    return prisma.plan.update({ where: { id }, data });
  }
}
