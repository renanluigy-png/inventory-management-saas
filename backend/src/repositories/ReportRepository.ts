import { FormaPagamento, Prisma, StatusVenda } from '@prisma/client';
import { prisma } from '../config/database';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface FinancialReportParams {
  dataInicio?: Date;
  dataFim?: Date;
  formaPagamento?: FormaPagamento;
  userId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'numero' | 'total' | 'createdAt';
  order?: 'asc' | 'desc';
}

// ----------------------------------------------------------------
// Includes reutilizáveis
// ----------------------------------------------------------------

const includeSaleDetail = {
  customer: { select: { id: true, nome: true, cpf: true } },
  user: { select: { id: true, nome: true } },
  itens: {
    include: {
      product: { select: { id: true, sku: true, nome: true, unidade: true } },
    },
  },
} satisfies Prisma.SaleInclude;

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class ReportRepository {
  /**
   * Relatório financeiro: resumo agregado + lista paginada de vendas.
   */
  async getFinancialReport(params: FinancialReportParams) {
    const {
      dataInicio,
      dataFim,
      formaPagamento,
      userId,
      customerId,
      search,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      order = 'desc',
    } = params;

    const dataFimFinal = dataFim
      ? new Date(new Date(dataFim).setHours(23, 59, 59, 999))
      : undefined;

    // Filtros de busca textual (numero ou nome do cliente)
    const searchWhere: Prisma.SaleWhereInput[] = [];
    if (search) {
      searchWhere.push(
        { customer: { nome: { contains: search, mode: 'insensitive' } } },
        { customer: { cpf: { contains: search.replace(/\D/g, '') } } }
      );
      const num = parseInt(search, 10);
      if (!isNaN(num)) searchWhere.push({ numero: num });
    }

    const where: Prisma.SaleWhereInput = {
      status: StatusVenda.FINALIZADA,
      ...(formaPagamento && { formaPagamento }),
      ...(userId && { userId }),
      ...(customerId && { customerId }),
      ...((dataInicio || dataFimFinal) && {
        createdAt: {
          ...(dataInicio && { gte: dataInicio }),
          ...(dataFimFinal && { lte: dataFimFinal }),
        },
      }),
      ...(searchWhere.length > 0 && { OR: searchWhere }),
    };

    const orderByClause: Prisma.SaleOrderByWithRelationInput =
      orderBy === 'total'
        ? { total: order }
        : orderBy === 'numero'
          ? { numero: order }
          : { createdAt: order };

    const skip = (page - 1) * limit;

    const [summary, total, vendas] = await Promise.all([
      // Resumo agregado: total vendido, descontos, quantidade
      prisma.sale.aggregate({
        where,
        _sum: { total: true, desconto: true },
        _count: { id: true },
      }),

      // Contagem para paginação
      prisma.sale.count({ where }),

      // Lista paginada com detalhes
      prisma.sale.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: includeSaleDetail,
      }),
    ]);

    const totalVendido =
      Math.round((Number(summary._sum.total ?? 0) - Number(summary._sum.desconto ?? 0)) * 100) / 100;
    const totalDescontos = Math.round(Number(summary._sum.desconto ?? 0) * 100) / 100;
    const quantidadeVendas = summary._count.id;
    const ticketMedio =
      quantidadeVendas > 0 ? Math.round((totalVendido / quantidadeVendas) * 100) / 100 : 0;

    // Lucro calculado via raw SQL (requer join com precoCusto do produto)
    const lucroRows = await prisma.$queryRaw<Array<{ lucro: string }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(
          CASE WHEN p."precoCusto" IS NOT NULL
            THEN (si."precoUnit" - p."precoCusto") * si.quantidade
            ELSE 0
          END
        ), 0) AS lucro
        FROM sales s
        JOIN sale_items si ON si."saleId" = s.id
        JOIN products   p  ON p.id        = si."productId"
        WHERE s.status = 'FINALIZADA'
          ${params.dataInicio ? Prisma.sql`AND s."createdAt" >= ${params.dataInicio}` : Prisma.sql``}
          ${dataFimFinal ? Prisma.sql`AND s."createdAt" <= ${dataFimFinal}` : Prisma.sql``}
          ${params.formaPagamento ? Prisma.sql`AND s."formaPagamento" = ${params.formaPagamento}::"FormaPagamento"` : Prisma.sql``}
          ${params.userId ? Prisma.sql`AND s."userId" = ${params.userId}` : Prisma.sql``}
          ${params.customerId ? Prisma.sql`AND s."customerId" = ${params.customerId}` : Prisma.sql``}
      `
    );

    const lucro = Math.round(Number(lucroRows[0]?.lucro ?? 0) * 100) / 100;

    // Breakdown por forma de pagamento
    const breakdown = await prisma.sale.groupBy({
      by: ['formaPagamento'],
      where,
      _sum: { total: true, desconto: true },
      _count: { id: true },
    });

    return {
      resumo: {
        totalVendido,
        lucro,
        totalDescontos,
        quantidadeVendas,
        ticketMedio,
      },
      porFormaPagamento: breakdown.map((b) => ({
        formaPagamento: b.formaPagamento,
        quantidade: b._count.id,
        totalVendido:
          Math.round((Number(b._sum.total ?? 0) - Number(b._sum.desconto ?? 0)) * 100) / 100,
      })),
      vendas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Relatório de estoque: snapshot atual com valor investido, valor de venda e lucro potencial.
   */
  async getInventoryReport(params: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    orderBy?: 'nome' | 'estoque' | 'preco' | 'createdAt';
    order?: 'asc' | 'desc';
  }) {
    const { search, categoryId, page = 1, limit = 20, orderBy = 'nome', order = 'asc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ativo: true,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { equals: search } },
        ],
      }),
    };

    const orderByClause: Prisma.ProductOrderByWithRelationInput =
      orderBy === 'estoque'
        ? { estoque: order }
        : orderBy === 'preco'
          ? { preco: order }
          : orderBy === 'createdAt'
            ? { createdAt: order }
            : { nome: order };

    const [valorRows, summaryRows, total, produtos] = await Promise.all([
      // Valor total investido (custo) e valor de venda do estoque atual
      prisma.$queryRaw<
        Array<{ valorInvestido: string; valorVenda: string; lucroPotencial: string }>
      >(
        Prisma.sql`
          SELECT
            COALESCE(SUM(estoque * "precoCusto"), 0)             AS "valorInvestido",
            COALESCE(SUM(estoque * preco), 0)                    AS "valorVenda",
            COALESCE(SUM(estoque * (preco - COALESCE("precoCusto", preco))), 0) AS "lucroPotencial"
          FROM products
          WHERE ativo = true
            ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.sql``}
        `
      ),

      // Contagem de produtos por status de estoque
      Promise.all([
        prisma.product.count({ where: { ...where, estoque: 0 } }),
        prisma.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`
            SELECT COUNT(*) AS count FROM products
            WHERE ativo = true AND estoque > 0 AND estoque <= "estoqueMinimo"
            ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.sql``}
          `
        ),
      ]),

      prisma.product.count({ where }),

      prisma.product.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, nome: true } },
        },
      }),
    ]);

    const [produtosSemEstoque, estoqueBaixoRows] = summaryRows;

    // Enriquece cada produto com status e valores calculados
    const produtosEnriquecidos = produtos.map((p) => ({
      ...p,
      statusEstoque:
        p.estoque === 0 ? 'ZERADO' : p.estoque <= p.estoqueMinimo ? 'BAIXO' : 'OK',
      valorEstoqueCusto:
        p.precoCusto !== null
          ? Math.round(Number(p.precoCusto) * p.estoque * 100) / 100
          : null,
      valorEstoqueVenda: Math.round(Number(p.preco) * p.estoque * 100) / 100,
      margemPercent:
        p.precoCusto !== null && Number(p.preco) > 0
          ? Math.round(
              ((Number(p.preco) - Number(p.precoCusto)) / Number(p.preco)) * 10000
            ) / 100
          : null,
    }));

    return {
      resumo: {
        totalProdutosAtivos: total,
        produtosSemEstoque,
        produtosEstoqueBaixo: Number(estoqueBaixoRows[0]?.count ?? 0),
        valorInvestido: Math.round(Number(valorRows[0]?.valorInvestido ?? 0) * 100) / 100,
        valorVenda: Math.round(Number(valorRows[0]?.valorVenda ?? 0) * 100) / 100,
        lucroPotencial: Math.round(Number(valorRows[0]?.lucroPotencial ?? 0) * 100) / 100,
      },
      produtos: produtosEnriquecidos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
