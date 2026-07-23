import { prisma } from '../config/database';

export interface CreateHistoricoInput {
  companyId?: string;
  entidade: string;
  entidadeId: string;
  acao: 'create' | 'update' | 'delete';
  usuarioId?: string;
  usuarioNome?: string;
  dadosAntes?: Record<string, unknown>;
  dadosDepois?: Record<string, unknown>;
  ip?: string;
}

export interface FindHistoricoParams {
  entidade?: string;
  entidadeId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

export class HistoricoRepository {
  async create(data: CreateHistoricoInput) {
    const camposAlterados = this.diffObjects(data.dadosAntes, data.dadosDepois);
    return prisma.entityHistory.create({
      data: {
        ...data,
        dadosAntes: data.dadosAntes as any,
        dadosDepois: data.dadosDepois as any,
        camposAlterados: camposAlterados as any,
      },
    });
  }

  async findByEntidade(entidade: string, entidadeId: string, companyId?: string) {
    return prisma.entityHistory.findMany({
      where: {
        entidade,
        entidadeId,
        ...(companyId && { companyId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findAll(params: FindHistoricoParams = {}) {
    const { entidade, entidadeId, companyId, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(entidade && { entidade }),
      ...(entidadeId && { entidadeId }),
      ...(companyId && { companyId }),
    };

    const [total, data] = await Promise.all([
      prisma.entityHistory.count({ where }),
      prisma.entityHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  private diffObjects(
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ): Record<string, { before: unknown; after: unknown }> {
    if (!before || !after) return {};
    const changed: Record<string, { before: unknown; after: unknown }> = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed[key] = { before: before[key], after: after[key] };
      }
    }
    return changed;
  }
}
