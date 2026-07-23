import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { prisma } from '../config/database';

// ----------------------------------------------------------------
// Includes compartilhados
// ----------------------------------------------------------------

const includeMovFull = {
  product: {
    select: {
      id: true,
      sku: true,
      nome: true,
      unidade: true,
      category: { select: { id: true, nome: true } },
    },
  },
  user: {
    select: { id: true, nome: true, email: true },
  },
} satisfies Prisma.MovimentacaoEstoqueInclude;

const includeProductCat = {
  category: { select: { id: true, nome: true } },
} satisfies Prisma.ProductInclude;

// ----------------------------------------------------------------
// Tipos inferidos
// ----------------------------------------------------------------

type MovimentacaoFull = Prisma.MovimentacaoEstoqueGetPayload<{
  include: typeof includeMovFull;
}>;

type ProductWithCat = Prisma.ProductGetPayload<{
  include: typeof includeProductCat;
}>;

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface FindAllMovimentacoesParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  userId?: string;
  tipo?: TipoMovimentacaoEstoque;
  dataInicio?: Date;
  dataFim?: Date;
  orderBy?: 'createdAt' | 'tipo' | 'quantidade';
  order?: 'asc' | 'desc';
}

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class StockRepository {
  // Lista movimentações com filtros completos e paginação
  async findAll(params: FindAllMovimentacoesParams): Promise<{
    data: MovimentacaoFull[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      productId,
      userId,
      tipo,
      dataInicio,
      dataFim,
      orderBy = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    // Ajusta dataFim para fim do dia quando apenas data foi fornecida
    const dataFimFinal = dataFim
      ? new Date(new Date(dataFim).setHours(23, 59, 59, 999))
      : undefined;

    const where: Prisma.MovimentacaoEstoqueWhereInput = {
      ...(productId && { productId }),
      ...(userId && { userId }),
      ...(tipo && { tipo }),
      ...((dataInicio || dataFimFinal) && {
        createdAt: {
          ...(dataInicio && { gte: dataInicio }),
          ...(dataFimFinal && { lte: dataFimFinal }),
        },
      }),
      ...(search && {
        product: {
          OR: [
            { nome: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { codigoBarras: { equals: search } },
          ],
        },
      }),
    };

    const orderByClause: Prisma.MovimentacaoEstoqueOrderByWithRelationInput =
      orderBy === 'tipo'       ? { tipo: order }       :
      orderBy === 'quantidade' ? { quantidade: order } :
      { createdAt: order };

    const [total, data] = await Promise.all([
      prisma.movimentacaoEstoque.count({ where }),
      prisma.movimentacaoEstoque.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: includeMovFull,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Alertas de estoque: sem estoque + abaixo do mínimo
  async getAlertas() {
    const [
      semEstoque,
      totalAtivos,
      estoqueBaixoRaw,
      countBaixoRaw,
    ] = await Promise.all([
      // Produtos com estoque zerado
      prisma.product.findMany({
        where: { estoque: 0, ativo: true },
        select: {
          id: true,
          sku: true,
          nome: true,
          estoque: true,
          estoqueMinimo: true,
          unidade: true,
          category: { select: { id: true, nome: true } },
        },
        orderBy: { nome: 'asc' },
      }),

      // Total de produtos ativos (para o resumo)
      prisma.product.count({ where: { ativo: true } }),

      // Produtos com estoque acima de zero mas abaixo do mínimo
      // Requer raw SQL para comparação de colunas do mesmo registro
      prisma.$queryRaw<any[]>(
        Prisma.sql`
          SELECT
            p.id, p.sku, p.nome,
            p.estoque, p."estoqueMinimo", p.unidade,
            c.id   AS "catId",
            c.nome AS "catNome"
          FROM products p
          LEFT JOIN categories c ON p."categoryId" = c.id
          WHERE p.estoque > 0
            AND p.estoque <= p."estoqueMinimo"
            AND p.ativo = true
          ORDER BY (p."estoqueMinimo" - p.estoque) DESC
        `
      ),

      // Contagem de produtos com estoque baixo (campo a campo)
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*) AS count
          FROM products
          WHERE estoque > 0 AND estoque <= "estoqueMinimo" AND ativo = true
        `
      ),
    ]);

    const estoqueBaixo = estoqueBaixoRaw.map((p) => ({
      id: p.id,
      sku: p.sku,
      nome: p.nome,
      estoque: Number(p.estoque),
      estoqueMinimo: Number(p.estoqueMinimo),
      unidade: p.unidade,
      category: p.catId ? { id: p.catId, nome: p.catNome } : null,
    }));

    const totalSemEstoque = semEstoque.length;
    const totalEstoqueBaixo = Number(countBaixoRaw[0].count);

    return {
      semEstoque: {
        total: totalSemEstoque,
        produtos: semEstoque,
      },
      estoqueBaixo: {
        total: totalEstoqueBaixo,
        produtos: estoqueBaixo,
      },
      resumo: {
        totalProdutosAtivos: totalAtivos,
        totalSemEstoque,
        totalEstoqueBaixo,
        totalComProblema: totalSemEstoque + totalEstoqueBaixo,
      },
    };
  }

  // Cria movimentação + atualiza estoque em transação atômica
  async criarMovimentacao(data: {
    productId: string;
    userId: string;
    tipo: TipoMovimentacaoEstoque;
    quantidade: number;
    quantAnterior: number;
    quantNova: number;
    motivo?: string;
    ip?: string;
  }): Promise<{ movimentacao: MovimentacaoFull; produto: ProductWithCat }> {
    const {
      productId, userId, tipo, quantidade,
      quantAnterior, quantNova, motivo, ip,
    } = data;

    const [movimentacao, produto] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          productId,
          userId,
          tipo,
          quantidade,
          quantAnterior,
          quantNova,
          motivo,
          ip,
        },
        include: includeMovFull,
      }),
      prisma.product.update({
        where: { id: productId },
        data: { estoque: quantNova },
        include: includeProductCat,
      }),
    ]);

    return { movimentacao, produto };
  }
}
