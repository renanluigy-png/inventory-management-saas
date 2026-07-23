import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { prisma } from '../config/database';

// ----------------------------------------------------------------
// Includes compartilhados (tipados pelo Prisma)
// ----------------------------------------------------------------

const includeCategory = {
  category: {
    select: { id: true, nome: true },
  },
} satisfies Prisma.ProductInclude;

const includeMovUser = {
  user: { select: { id: true, nome: true } },
} satisfies Prisma.MovimentacaoEstoqueInclude;

// ----------------------------------------------------------------
// Tipos inferidos
// ----------------------------------------------------------------

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof includeCategory;
}>;

type MovimentacaoComUser = Prisma.MovimentacaoEstoqueGetPayload<{
  include: typeof includeMovUser;
}>;

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class ProductRepository {
  async findById(id: string): Promise<ProductWithCategory | null> {
    return prisma.product.findUnique({
      where: { id },
      include: includeCategory,
    });
  }

  async findBySku(sku: string): Promise<{ id: string; sku: string | null } | null> {
    return prisma.product.findUnique({
      where: { sku },
      select: { id: true, sku: true },
    });
  }

  async findByCodigoBarras(codigoBarras: string): Promise<ProductWithCategory | null> {
    return prisma.product.findUnique({
      where: { codigoBarras },
      include: includeCategory,
    });
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    ativo?: boolean;
    orderBy?: 'nome' | 'preco' | 'estoque' | 'createdAt';
    order?: 'asc' | 'desc';
    companyId?: string | null;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      ativo,
      orderBy = 'nome',
      order = 'asc',
      companyId,
    } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { descricao: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { equals: search } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(ativo !== undefined && { ativo }),
      ...(companyId != null && { companyId }),
    };

    // Ordenação type-safe — evita indexação dinâmica não tipada
    const orderByClause: Prisma.ProductOrderByWithRelationInput =
      orderBy === 'preco'     ? { preco: order }     :
      orderBy === 'estoque'   ? { estoque: order }   :
      orderBy === 'createdAt' ? { createdAt: order } :
      { nome: order };

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: includeCategory,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Usa raw SQL porque Prisma não suporta comparação entre colunas da mesma tabela
  async findComEstoqueBaixo(params?: { page?: number; limit?: number; companyId?: string | null }) {
    const { page = 1, limit = 20, companyId } = params ?? {};
    const offset = (page - 1) * limit;

    const companyFilter = companyId != null
      ? Prisma.sql`AND p."companyId" = ${companyId}`
      : Prisma.sql``;

    const companyFilterPlain = companyId != null
      ? Prisma.sql`AND "companyId" = ${companyId}`
      : Prisma.sql``;

    const [data, countResult] = await Promise.all([
      prisma.$queryRaw<any[]>(
        Prisma.sql`
          SELECT
            p.id, p.sku, p.nome, p.descricao,
            p.preco, p."precoCusto",
            p.estoque, p."estoqueMinimo",
            p."codigoBarras", p.unidade,
            p."imagemUrl",
            p.ativo, p."categoryId",
            p."createdAt", p."updatedAt",
            c.id   AS "catId",
            c.nome AS "catNome"
          FROM products p
          LEFT JOIN categories c ON p."categoryId" = c.id
          WHERE p.estoque <= p."estoqueMinimo"
            AND p.ativo = true
            ${companyFilter}
          ORDER BY (p."estoqueMinimo" - p.estoque) DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*) AS count
          FROM products
          WHERE estoque <= "estoqueMinimo" AND ativo = true
          ${companyFilterPlain}
        `
      ),
    ]);

    const total = Number(countResult[0].count);

    const formattedData = data.map((p) => ({
      id: p.id,
      sku: p.sku,
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco,
      precoCusto: p.precoCusto,
      estoque: Number(p.estoque),
      estoqueMinimo: Number(p.estoqueMinimo),
      codigoBarras: p.codigoBarras,
      unidade: p.unidade,
      imagemUrl: p.imagemUrl,
      ativo: p.ativo,
      categoryId: p.categoryId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      category: p.catId ? { id: p.catId, nome: p.catNome } : null,
    }));

    return {
      data: formattedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Retorna estoque atual + histórico paginado de movimentações
  async consultarEstoque(
    productId: string,
    params: { page: number; limit: number }
  ): Promise<{
    produto: {
      id: string;
      sku: string | null;
      nome: string;
      estoque: number;
      estoqueMinimo: number;
      statusEstoque: 'OK' | 'BAIXO' | 'ZERADO';
    };
    historico: {
      data: MovimentacaoComUser[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
  } | null> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const produto = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, nome: true, estoque: true, estoqueMinimo: true },
    });

    if (!produto) return null;

    const [total, historico] = await Promise.all([
      prisma.movimentacaoEstoque.count({ where: { productId } }),
      prisma.movimentacaoEstoque.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: includeMovUser,
      }),
    ]);

    const statusEstoque: 'OK' | 'BAIXO' | 'ZERADO' =
      produto.estoque === 0      ? 'ZERADO' :
      produto.estoque <= produto.estoqueMinimo ? 'BAIXO'  :
      'OK';

    return {
      produto: { ...produto, statusEstoque },
      historico: {
        data: historico,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  // Ajusta estoque em transação atômica: atualiza produto + registra movimentação
  async ajustarEstoque(data: {
    productId: string;
    userId: string;
    tipo: TipoMovimentacaoEstoque;
    quantidade: number;
    quantAnterior: number;
    quantNova: number;
    motivo?: string;
  }): Promise<{ movimentacao: MovimentacaoComUser; produto: ProductWithCategory }> {
    const { productId, userId, tipo, quantidade, quantAnterior, quantNova, motivo } = data;

    const [movimentacao, produto] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: { productId, userId, tipo, quantidade, quantAnterior, quantNova, motivo },
        include: includeMovUser,
      }),
      prisma.product.update({
        where: { id: productId },
        data: { estoque: quantNova },
        include: includeCategory,
      }),
    ]);

    return { movimentacao, produto };
  }

  async create(data: Prisma.ProductCreateInput): Promise<ProductWithCategory> {
    return prisma.product.create({
      data,
      include: includeCategory,
    });
  }

  async update(
    id: string,
    data: Prisma.ProductUpdateInput
  ): Promise<ProductWithCategory> {
    return prisma.product.update({
      where: { id },
      data,
      include: includeCategory,
    });
  }

  async softDelete(id: string): Promise<ProductWithCategory> {
    return prisma.product.update({
      where: { id },
      data: { ativo: false },
      include: includeCategory,
    });
  }
}
