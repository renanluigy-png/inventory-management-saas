import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const includeAuditFull = {
  usuario: { select: { id: true, nome: true, email: true, role: true } },
} satisfies Prisma.AuditLogInclude;

type AuditLogFull = Prisma.AuditLogGetPayload<{ include: typeof includeAuditFull }>;

export interface CreateAuditLogData {
  usuarioId?: string;
  entidade: string;
  entidadeId?: string;
  acao: AuditAction;
  dadosAntes?: Prisma.InputJsonValue | null;
  dadosDepois?: Prisma.InputJsonValue | null;
  ip?: string;
  userAgent?: string;
}

export interface FindAllAuditParams {
  page?: number;
  limit?: number;
  usuarioId?: string;
  entidade?: string;
  acao?: AuditAction;
  dataInicio?: Date;
  dataFim?: Date;
  order?: 'asc' | 'desc';
}

export class AuditRepository {
  /** Cria um registro de auditoria. Fire-and-forget — não lança exceções para o chamador. */
  async create(data: CreateAuditLogData): Promise<void> {
    await prisma.auditLog.create({
      data: {
        usuarioId: data.usuarioId,
        entidade: data.entidade,
        entidadeId: data.entidadeId,
        acao: data.acao,
        dadosAntes: data.dadosAntes ?? Prisma.JsonNull,
        dadosDepois: data.dadosDepois ?? Prisma.JsonNull,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  /** Lista registros de auditoria com filtros e paginação. */
  async findAll(params: FindAllAuditParams): Promise<{
    data: AuditLogFull[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      usuarioId,
      entidade,
      acao,
      dataInicio,
      dataFim,
      order = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const dataFimFinal = dataFim
      ? new Date(new Date(dataFim).setHours(23, 59, 59, 999))
      : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(usuarioId && { usuarioId }),
      ...(entidade && { entidade: { contains: entidade, mode: 'insensitive' } }),
      ...(acao && { acao }),
      ...((dataInicio || dataFimFinal) && {
        dataHora: {
          ...(dataInicio && { gte: dataInicio }),
          ...(dataFimFinal && { lte: dataFimFinal }),
        },
      }),
    };

    const [total, data] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { dataHora: order },
        skip,
        take: limit,
        include: includeAuditFull,
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
