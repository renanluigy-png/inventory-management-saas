import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class CategoryRepository {
  // Retorna categoria com contagem de produtos ativos vinculados
  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { produtos: { where: { ativo: true } } },
        },
      },
    });
  }

  async findByNome(nome: string) {
    return prisma.category.findUnique({ where: { nome } });
  }

  // Verifica se a categoria existe e está ativa (uso interno entre serviços)
  async existsAndActive(id: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id, ativo: true },
      select: { id: true },
    });
    return !!category;
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
    orderBy?: 'nome' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    companyId?: string | null;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      ativo,
      orderBy = 'nome',
      order = 'asc',
      companyId,
    } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      ...(search && {
        nome: { contains: search, mode: 'insensitive' },
      }),
      ...(ativo !== undefined && { ativo }),
      ...(companyId != null && { companyId }),
    };

    // Ordenação type-safe
    const orderByClause: Prisma.CategoryOrderByWithRelationInput =
      orderBy === 'createdAt' ? { createdAt: order } :
      orderBy === 'updatedAt' ? { updatedAt: order } :
      { nome: order };

    const [total, data] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          _count: {
            select: { produtos: { where: { ativo: true } } },
          },
        },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  }

  // Soft delete: mantém histórico no banco, apenas desativa
  async softDelete(id: string) {
    return prisma.category.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
