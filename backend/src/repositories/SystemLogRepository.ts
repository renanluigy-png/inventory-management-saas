import { LogNivel, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateSystemLogInput {
  companyId?: string;
  nivel?: LogNivel;
  categoria: string;
  mensagem: string;
  detalhes?: Record<string, unknown>;
  usuarioId?: string;
  ip?: string;
  path?: string;
  metodo?: string;
  statusCode?: number;
  duracao?: number;
  stackTrace?: string;
}

export interface FindSystemLogsParams {
  companyId?: string;
  nivel?: LogNivel;
  categoria?: string;
  page?: number;
  limit?: number;
  desde?: Date;
  ate?: Date;
}

export class SystemLogRepository {
  async create(data: CreateSystemLogInput) {
    return prisma.systemLog.create({
      data: { ...data, detalhes: data.detalhes as any },
    });
  }

  async findAll(params: FindSystemLogsParams = {}) {
    const { companyId, nivel, categoria, page = 1, limit = 50, desde, ate } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SystemLogWhereInput = {
      ...(companyId && { companyId }),
      ...(nivel && { nivel }),
      ...(categoria && { categoria }),
      ...(desde || ate
        ? { createdAt: { ...(desde && { gte: desde }), ...(ate && { lte: ate }) } }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async countByNivel(companyId?: string) {
    const levels = Object.values(LogNivel);
    const counts = await Promise.all(
      levels.map(async (nivel) => ({
        nivel,
        count: await prisma.systemLog.count({
          where: { nivel, ...(companyId ? { companyId } : {}) },
        }),
      }))
    );
    return Object.fromEntries(counts.map(({ nivel, count }) => [nivel, count]));
  }

  async getSlowRequests(thresholdMs = 500, limit = 20) {
    return prisma.systemLog.findMany({
      where: { duracao: { gte: thresholdMs } },
      orderBy: { duracao: 'desc' },
      take: limit,
    });
  }

  async getRecentErrors(limit = 20) {
    return prisma.systemLog.findMany({
      where: { nivel: { in: [LogNivel.ERROR, LogNivel.CRITICAL] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.systemLog.deleteMany({
      where: { createdAt: { lt: cutoff }, nivel: { in: [LogNivel.DEBUG, LogNivel.INFO] } },
    });
    return result.count;
  }
}
