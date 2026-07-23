import { Meta, MetaTipo, MetaPeriodo, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateMetaInput {
  companyId?: string;
  tipo: MetaTipo;
  nome: string;
  descricao?: string;
  valorAlvo: number;
  periodo: MetaPeriodo;
  inicioEm: Date;
  fimEm: Date;
  entidadeId?: string;
  entidadeTipo?: string;
}

export interface FindMetasParams {
  companyId?: string;
  tipo?: MetaTipo;
  periodo?: MetaPeriodo;
  ativa?: boolean;
  page?: number;
  limit?: number;
}

export class MetaRepository {
  async findAll(params: FindMetasParams = {}) {
    const { companyId, tipo, periodo, ativa, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MetaWhereInput = {
      ...(companyId && { companyId }),
      ...(tipo && { tipo }),
      ...(periodo && { periodo }),
      ...(ativa !== undefined && { ativa }),
    };

    const [total, data] = await Promise.all([
      prisma.meta.count({ where }),
      prisma.meta.findMany({ where, orderBy: { fimEm: 'asc' }, skip, take: limit }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string): Promise<Meta | null> {
    return prisma.meta.findUnique({ where: { id } });
  }

  async findAtivas(companyId: string): Promise<Meta[]> {
    const now = new Date();
    return prisma.meta.findMany({
      where: { companyId, ativa: true, inicioEm: { lte: now }, fimEm: { gte: now } },
      orderBy: { fimEm: 'asc' },
    });
  }

  async create(data: CreateMetaInput): Promise<Meta> {
    return prisma.meta.create({
      data: {
        ...data,
        valorAlvo: new Prisma.Decimal(data.valorAlvo),
      },
    });
  }

  async update(id: string, data: Partial<CreateMetaInput>): Promise<Meta> {
    return prisma.meta.update({
      where: { id },
      data: {
        ...data,
        ...(data.valorAlvo !== undefined && { valorAlvo: new Prisma.Decimal(data.valorAlvo) }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.meta.delete({ where: { id } });
  }

  async getProgressoVendasValor(companyId: string, inicioEm: Date, fimEm: Date): Promise<number> {
    const result = await prisma.sale.aggregate({
      where: { companyId, status: 'FINALIZADA', createdAt: { gte: inicioEm, lte: fimEm } },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  async getProgressoVendasQtd(companyId: string, inicioEm: Date, fimEm: Date): Promise<number> {
    return prisma.sale.count({
      where: { companyId, status: 'FINALIZADA', createdAt: { gte: inicioEm, lte: fimEm } },
    });
  }

  async getProgressoClientesNovos(companyId: string, inicioEm: Date, fimEm: Date): Promise<number> {
    return prisma.customer.count({
      where: { companyId, createdAt: { gte: inicioEm, lte: fimEm } },
    });
  }
}
