import { CompanyRepository } from '../repositories/CompanyRepository';
import { appCache, CacheKeys, TTL_SECONDS } from '../utils/cache';
import { prisma } from '../config/database';
import { PlatformStats } from '../types/saas.types';

export class MasterService {
  private companyRepo: CompanyRepository;

  constructor() {
    this.companyRepo = new CompanyRepository();
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const cached = appCache.get<PlatformStats>(CacheKeys.PLATFORM_STATS);
    if (cached) return cached;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      companyCounts,
      novosUltimoMes,
      cancelamentosUltimoMes,
      totalUsuarios,
    ] = await Promise.all([
      this.companyRepo.countByStatus(),
      this.companyRepo.countNewLastMonth(),
      prisma.subscription.count({
        where: { status: 'CANCELADA', canceledAt: { gte: startOfMonth } },
      }),
      prisma.user.count({ where: { ativo: true, role: { not: 'MASTER' } } }),
    ]);

    const totalAtivas = companyCounts.ativas ?? 0;
    const churnRate = totalAtivas > 0
      ? Math.round((cancelamentosUltimoMes / totalAtivas) * 100 * 100) / 100
      : 0;

    const stats: PlatformStats = {
      totalEmpresas: companyCounts.total,
      empresasAtivas: totalAtivas,
      empresasTrial: companyCounts.trial ?? 0,
      empresasSuspensas: companyCounts.suspensas ?? 0,
      novosUltimoMes,
      cancelamentosUltimoMes,
      mrr: 0, // sistema de cobrança não implementado
      arr: 0,
      churnRate,
      totalUsuarios,
    };

    appCache.set(CacheKeys.PLATFORM_STATS, stats, TTL_SECONDS.PLATFORM_STATS);
    return stats;
  }

  async listCompanies(params?: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
  }) {
    return this.companyRepo.findAll(params);
  }

  async getCompanyDetail(companyId: string) {
    const [company, usage] = await Promise.all([
      this.companyRepo.findById(companyId),
      this.getCompanyUsage(companyId),
    ]);
    return { ...company, usage };
  }

  private async getCompanyUsage(companyId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usuarios, produtos, clientes, vendasMes, storage] = await Promise.all([
      prisma.user.count({ where: { companyId, ativo: true } }),
      prisma.product.count({ where: { companyId, ativo: true } }),
      prisma.customer.count({ where: { companyId, ativo: true } }),
      prisma.sale.count({
        where: { companyId, status: 'FINALIZADA', createdAt: { gte: startOfMonth } },
      }),
      prisma.fileUpload.aggregate({
        where: { companyId },
        _sum: { tamanhoBytes: true },
      }),
    ]);

    return {
      usuarios,
      produtos,
      clientes,
      vendasMes,
      storageMb: Math.round((storage._sum.tamanhoBytes ?? 0) / (1024 * 1024)),
    };
  }

  async getRecentAuditLogs(limit = 50) {
    return prisma.auditLog.findMany({
      orderBy: { dataHora: 'desc' },
      take: limit,
      include: { usuario: { select: { nome: true, email: true } } },
    });
  }

  async getAuditLogsByCompany(companyId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { dataHora: 'desc' },
      take: limit,
      include: { usuario: { select: { nome: true, email: true } } },
    });
  }
}
