import { Prisma, TipoPromocao } from '@prisma/client';
import { prisma } from '../config/database';

export class PromotionRepository {
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
    vigente?: boolean;
  }) {
    const { page = 1, limit = 20, search, ativo, vigente } = params;
    const skip = (page - 1) * limit;
    const agora = new Date();

    const where: Prisma.PromocaoWhereInput = {
      ...(search && { nome: { contains: search, mode: 'insensitive' } }),
      ...(ativo !== undefined && { ativo }),
      ...(vigente && {
        dataInicio: { lte: agora },
        OR: [{ dataFim: null }, { dataFim: { gte: agora } }],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.promocao.count({ where }),
      prisma.promocao.findMany({
        where,
        skip,
        take: limit,
        include: {
          produtos: { include: { product: { select: { id: true, nome: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return prisma.promocao.findUnique({
      where: { id },
      include: {
        produtos: { include: { product: { select: { id: true, nome: true, sku: true, preco: true } } } },
      },
    });
  }

  async create(data: {
    nome: string;
    descricao?: string;
    tipo: TipoPromocao;
    valor: number;
    dataInicio: Date;
    dataFim?: Date;
    produtoIds?: string[];
  }) {
    const { produtoIds = [], ...rest } = data;
    return prisma.promocao.create({
      data: {
        ...rest,
        produtos: {
          create: produtoIds.map((productId) => ({ productId })),
        },
      },
      include: { produtos: { include: { product: true } } },
    });
  }

  async update(
    id: string,
    data: {
      nome?: string;
      descricao?: string;
      tipo?: TipoPromocao;
      valor?: number;
      ativo?: boolean;
      dataInicio?: Date;
      dataFim?: Date | null;
      produtoIds?: string[];
    }
  ) {
    const { produtoIds, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      if (produtoIds !== undefined) {
        await tx.promocaoProduct.deleteMany({ where: { promocaoId: id } });
        if (produtoIds.length > 0) {
          await tx.promocaoProduct.createMany({
            data: produtoIds.map((productId) => ({ promocaoId: id, productId })),
          });
        }
      }

      return tx.promocao.update({
        where: { id },
        data: rest,
        include: { produtos: { include: { product: true } } },
      });
    });
  }

  async delete(id: string) {
    return prisma.promocao.delete({ where: { id } });
  }

  async findVigentesParaProduto(productId: string) {
    const agora = new Date();
    return prisma.promocao.findMany({
      where: {
        ativo: true,
        dataInicio: { lte: agora },
        OR: [{ dataFim: null }, { dataFim: { gte: agora } }],
        produtos: { some: { productId } },
      },
    });
  }
}
