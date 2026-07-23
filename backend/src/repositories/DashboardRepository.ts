import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// ----------------------------------------------------------------
// Tipos internos dos resultados raw
// ----------------------------------------------------------------

type TopProductRow = {
  id: string;
  sku: string | null;
  nome: string;
  imagemUrl: string | null;
  quantidadeVendida: bigint;
  faturamento: string;
  lucro: string;
};

type SalesChartRow = {
  data: Date | string;
  valor: string;
  quantidade: bigint;
};

type CashFlowRow = {
  data: Date;
  entradas: string;
  saidas: string;
  saldo: string;
};

type DeadStockRow = {
  id: string;
  sku: string | null;
  nome: string;
  estoque: number;
  estoqueMinimo: number;
  unidade: string;
  preco: string;
  categorianome: string | null;
  ultimavenda: Date | null;
};

type TopCustomerRow = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  quantidadeCompras: bigint;
  valorGasto: string;
  ticketMedio: string;
  ultimaCompra: Date | null;
};

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class DashboardRepository {
  /**
   * Retorna todos os KPIs do painel principal em paralelo.
   */
  async getMetrics() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [
      vendasHoje,
      vendasMes,
      lucroHojeRows,
      lucroMesRows,
      quantidadeProdutos,
      quantidadeClientes,
      produtosSemEstoque,
      estoqueBaixoRows,
      caixaAberto,
    ] = await Promise.all([
      // Faturamento bruto + desconto + quantidade de vendas hoje
      prisma.sale.aggregate({
        where: { status: 'FINALIZADA', createdAt: { gte: inicioHoje } },
        _sum: { total: true, desconto: true },
        _count: { id: true },
      }),

      // Faturamento bruto + desconto + quantidade de vendas do mês
      prisma.sale.aggregate({
        where: { status: 'FINALIZADA', createdAt: { gte: inicioMes } },
        _sum: { total: true, desconto: true },
        _count: { id: true },
      }),

      // Lucro hoje: (precoUnit - precoCusto) * quantidade por item vendido
      prisma.$queryRaw<Array<{ lucro: string }>>(
        Prisma.sql`
          SELECT COALESCE(SUM(
            CASE WHEN p."precoCusto" IS NOT NULL
              THEN (si."precoUnit" - p."precoCusto") * si.quantidade
              ELSE 0
            END
          ), 0) AS lucro
          FROM sales s
          JOIN sale_items si ON si."saleId" = s.id
          JOIN products p ON p.id = si."productId"
          WHERE s.status = 'FINALIZADA'
            AND s."createdAt" >= ${inicioHoje}
        `
      ),

      // Lucro mês
      prisma.$queryRaw<Array<{ lucro: string }>>(
        Prisma.sql`
          SELECT COALESCE(SUM(
            CASE WHEN p."precoCusto" IS NOT NULL
              THEN (si."precoUnit" - p."precoCusto") * si.quantidade
              ELSE 0
            END
          ), 0) AS lucro
          FROM sales s
          JOIN sale_items si ON si."saleId" = s.id
          JOIN products p ON p.id = si."productId"
          WHERE s.status = 'FINALIZADA'
            AND s."createdAt" >= ${inicioMes}
        `
      ),

      prisma.product.count({ where: { ativo: true } }),
      prisma.customer.count({ where: { ativo: true } }),
      prisma.product.count({ where: { ativo: true, estoque: 0 } }),

      // Produtos com estoque acima de zero mas abaixo do mínimo
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*) AS count
          FROM products
          WHERE ativo = true AND estoque > 0 AND estoque <= "estoqueMinimo"
        `
      ),

      // Caixa aberto mais recente (se houver)
      prisma.caixa.findFirst({
        where: { status: 'ABERTO' },
        select: {
          id: true,
          saldoInicial: true,
          abertura: true,
          user: { select: { id: true, nome: true } },
        },
        orderBy: { abertura: 'desc' },
      }),
    ]);

    // Calcula saldo do caixa via agregação por tipo de movimento
    let caixaAtual: {
      id: string;
      responsavel: { id: string; nome: string };
      abertura: Date;
      saldoAtual: number;
    } | null = null;

    if (caixaAberto) {
      const movsByTipo = await prisma.caixaMovimentacao.groupBy({
        by: ['tipo'],
        where: { caixaId: caixaAberto.id },
        _sum: { valor: true },
      });

      let saldo = Number(caixaAberto.saldoInicial);
      for (const m of movsByTipo) {
        const val = Number(m._sum.valor ?? 0);
        saldo += m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO' ? val : -val;
      }

      caixaAtual = {
        id: caixaAberto.id,
        responsavel: caixaAberto.user,
        abertura: caixaAberto.abertura,
        saldoAtual: Math.round(saldo * 100) / 100,
      };
    }

    const faturamentoHoje =
      Math.round((Number(vendasHoje._sum.total ?? 0) - Number(vendasHoje._sum.desconto ?? 0)) * 100) / 100;
    const faturamentoMes =
      Math.round((Number(vendasMes._sum.total ?? 0) - Number(vendasMes._sum.desconto ?? 0)) * 100) / 100;
    const quantidadeVendasHoje = vendasHoje._count.id;
    const quantidadeVendasMes = vendasMes._count.id;
    const lucroHoje = Math.round(Number(lucroHojeRows[0]?.lucro ?? 0) * 100) / 100;
    const lucroMes = Math.round(Number(lucroMesRows[0]?.lucro ?? 0) * 100) / 100;
    const ticketMedio =
      quantidadeVendasMes > 0
        ? Math.round((faturamentoMes / quantidadeVendasMes) * 100) / 100
        : 0;

    return {
      faturamentoHoje,
      faturamentoMes,
      lucroHoje,
      lucroMes,
      quantidadeVendasHoje,
      quantidadeVendasMes,
      quantidadeProdutos,
      quantidadeClientes,
      produtosSemEstoque,
      produtosEstoqueBaixo: Number(estoqueBaixoRows[0]?.count ?? 0),
      ticketMedio,
      caixaAtual,
    };
  }

  /**
   * Produtos mais vendidos em quantidade, com faturamento e lucro por produto.
   */
  async getTopProducts(limit: number = 10) {
    const rows = await prisma.$queryRaw<TopProductRow[]>(
      Prisma.sql`
        SELECT
          p.id,
          p.sku,
          p.nome,
          p."imagemUrl",
          SUM(si.quantidade)::bigint                                  AS "quantidadeVendida",
          SUM(si.subtotal)                                            AS faturamento,
          COALESCE(SUM(
            CASE WHEN p."precoCusto" IS NOT NULL
              THEN (si."precoUnit" - p."precoCusto") * si.quantidade
              ELSE 0
            END
          ), 0)                                                       AS lucro
        FROM sale_items si
        JOIN products  p ON p.id  = si."productId"
        JOIN sales     s ON s.id  = si."saleId"
        WHERE s.status = 'FINALIZADA'
        GROUP BY p.id, p.sku, p.nome, p."imagemUrl"
        ORDER BY "quantidadeVendida" DESC
        LIMIT ${limit}
      `
    );

    return rows.map((r) => ({
      produto: { id: r.id, sku: r.sku, nome: r.nome, imagemUrl: r.imagemUrl },
      quantidadeVendida: Number(r.quantidadeVendida),
      faturamento: Math.round(Number(r.faturamento) * 100) / 100,
      lucro: Math.round(Number(r.lucro) * 100) / 100,
    }));
  }

  /**
   * Dados de vendas agrupados por período, prontos para gráficos.
   * Agrupamento: 7d/30d → dia | 90d → semana | 12m → mês
   */
  async getSalesChart(period: '7d' | '30d' | '90d' | '12m') {
    if (period === '12m') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 12);

      const rows = await prisma.$queryRaw<Array<{ data: string; valor: string; quantidade: bigint }>>(
        Prisma.sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', s."createdAt"), 'YYYY-MM') AS data,
            SUM(s.total - s.desconto)                               AS valor,
            COUNT(*)::bigint                                        AS quantidade
          FROM sales s
          WHERE s.status = 'FINALIZADA'
            AND s."createdAt" >= ${cutoff}
          GROUP BY DATE_TRUNC('month', s."createdAt")
          ORDER BY DATE_TRUNC('month', s."createdAt") ASC
        `
      );

      return rows.map((r) => ({
        data: r.data,
        total: Math.round(Number(r.valor) * 100) / 100,
        quantidade: Number(r.quantidade),
      }));
    }

    if (period === '90d') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const rows = await prisma.$queryRaw<Array<{ data: Date; valor: string; quantidade: bigint }>>(
        Prisma.sql`
          SELECT
            DATE_TRUNC('week', s."createdAt")  AS data,
            SUM(s.total - s.desconto)          AS valor,
            COUNT(*)::bigint                   AS quantidade
          FROM sales s
          WHERE s.status = 'FINALIZADA'
            AND s."createdAt" >= ${cutoff}
          GROUP BY DATE_TRUNC('week', s."createdAt")
          ORDER BY data ASC
        `
      );

      return rows.map((r) => ({
        data: r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data),
        total: Math.round(Number(r.valor) * 100) / 100,
        quantidade: Number(r.quantidade),
      }));
    }

    // 7d ou 30d → agrupado por dia
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await prisma.$queryRaw<Array<{ data: Date; valor: string; quantidade: bigint }>>(
      Prisma.sql`
        SELECT
          DATE(s."createdAt")        AS data,
          SUM(s.total - s.desconto)  AS valor,
          COUNT(*)::bigint           AS quantidade
        FROM sales s
        WHERE s.status = 'FINALIZADA'
          AND s."createdAt" >= ${cutoff}
        GROUP BY DATE(s."createdAt")
        ORDER BY data ASC
      `
    );

    return rows.map((r) => ({
      data: r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data),
      valor: Math.round(Number(r.valor) * 100) / 100,
      quantidade: Number(r.quantidade),
    }));
  }

  /**
   * Fluxo de caixa diário com saldo acumulado.
   */
  async getCashFlow(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await prisma.$queryRaw<CashFlowRow[]>(
      Prisma.sql`
        SELECT
          DATE(m."createdAt") AS data,
          COALESCE(SUM(CASE WHEN m.tipo IN ('ENTRADA', 'SUPRIMENTO') THEN m.valor ELSE 0   END), 0) AS entradas,
          COALESCE(SUM(CASE WHEN m.tipo IN ('SAIDA',   'SANGRIA')    THEN m.valor ELSE 0   END), 0) AS saidas,
          COALESCE(SUM(CASE WHEN m.tipo IN ('ENTRADA', 'SUPRIMENTO') THEN m.valor ELSE -m.valor END), 0) AS saldo
        FROM caixa_movimentacoes m
        WHERE m."createdAt" >= ${cutoff}
        GROUP BY DATE(m."createdAt")
        ORDER BY data ASC
      `
    );

    let saldoCumulativo = 0;
    return rows.map((r) => {
      const saldoDia = Math.round(Number(r.saldo) * 100) / 100;
      saldoCumulativo = Math.round((saldoCumulativo + saldoDia) * 100) / 100;
      return {
        data: r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data),
        entradas: Math.round(Number(r.entradas) * 100) / 100,
        saidas: Math.round(Number(r.saidas) * 100) / 100,
        saldo: saldoDia,
        saldoCumulativo,
      };
    });
  }

  /**
   * Produtos sem movimentação de venda nos últimos X dias (estoque parado).
   */
  async getDeadStock(
    days: number = 60,
    params: { page?: number; limit?: number; search?: string }
  ) {
    const { page = 1, limit = 20, search } = params;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? Prisma.sql`AND (p.nome ILIKE ${'%' + search + '%'} OR p.sku ILIKE ${'%' + search + '%'})`
      : Prisma.sql``;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<DeadStockRow[]>(
        Prisma.sql`
          SELECT
            p.id, p.sku, p.nome, p.estoque, p."estoqueMinimo", p.unidade,
            p.preco,
            c.nome AS "categoriaNome",
            MAX(s."createdAt") AS "ultimaVenda"
          FROM products p
          LEFT JOIN categories c ON c.id = p."categoryId"
          LEFT JOIN sale_items si ON si."productId" = p.id
          LEFT JOIN sales s ON s.id = si."saleId" AND s.status = 'FINALIZADA'
          WHERE p.ativo = true
          ${searchFilter}
          GROUP BY p.id, p.sku, p.nome, p.estoque, p."estoqueMinimo", p.unidade, p.preco, c.nome
          HAVING MAX(s."createdAt") IS NULL OR MAX(s."createdAt") < ${cutoff}
          ORDER BY p.nome ASC
          LIMIT ${limit} OFFSET ${skip}
        `
      ),
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*) AS count
          FROM (
            SELECT p.id
            FROM products p
            LEFT JOIN sale_items si ON si."productId" = p.id
            LEFT JOIN sales s ON s.id = si."saleId" AND s.status = 'FINALIZADA'
            WHERE p.ativo = true
            ${searchFilter}
            GROUP BY p.id
            HAVING MAX(s."createdAt") IS NULL OR MAX(s."createdAt") < ${cutoff}
          ) AS sub
        `
      ),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    return {
      data: rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        nome: r.nome,
        estoque: Number(r.estoque),
        estoqueMinimo: Number(r.estoqueMinimo),
        unidade: r.unidade,
        preco: Math.round(Number(r.preco) * 100) / 100,
        categoriaNome: r.categorianome,
        ultimaVenda: r.ultimavenda ?? null,
        diasSemVenda: r.ultimavenda
          ? Math.floor((Date.now() - new Date(r.ultimavenda).getTime()) / 86400000)
          : null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Produtos mais lucrativos (margem de lucro em valor absoluto).
   */
  async getTopProfit(limit: number = 10) {
    const rows = await prisma.$queryRaw<TopProductRow[]>(
      Prisma.sql`
        SELECT
          p.id,
          p.sku,
          p.nome,
          p."imagemUrl",
          SUM(si.quantidade)::bigint       AS "quantidadeVendida",
          SUM(si.subtotal)                 AS faturamento,
          COALESCE(SUM(
            CASE WHEN p."precoCusto" IS NOT NULL
              THEN (si."precoUnit" - p."precoCusto") * si.quantidade
              ELSE 0
            END
          ), 0)                            AS lucro
        FROM sale_items si
        JOIN products  p ON p.id = si."productId"
        JOIN sales     s ON s.id = si."saleId"
        WHERE s.status = 'FINALIZADA'
        GROUP BY p.id, p.sku, p.nome, p."imagemUrl"
        ORDER BY lucro DESC
        LIMIT ${limit}
      `
    );

    return rows.map((r) => {
      const faturamento = Math.round(Number(r.faturamento) * 100) / 100;
      const lucro = Math.round(Number(r.lucro) * 100) / 100;
      const margemPercent =
        faturamento > 0 ? Math.round((lucro / faturamento) * 10000) / 100 : 0;

      return {
        produto: { id: r.id, sku: r.sku, nome: r.nome, imagemUrl: r.imagemUrl },
        quantidadeVendida: Number(r.quantidadeVendida),
        faturamento,
        lucro,
        margemPercent,
      };
    });
  }

  /**
   * Distribuição de vendas por forma de pagamento.
   */
  async getSalesByPayment(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await prisma.$queryRaw<
      Array<{ formaPagamento: string | null; quantidade: bigint; totalVendido: string }>
    >(
      Prisma.sql`
        SELECT
          s."formaPagamento",
          COUNT(*)::bigint         AS quantidade,
          SUM(s.total - s.desconto) AS "totalVendido"
        FROM sales s
        WHERE s.status = 'FINALIZADA'
          AND s."createdAt" >= ${cutoff}
        GROUP BY s."formaPagamento"
        ORDER BY "totalVendido" DESC
      `
    );

    return rows.map((r) => ({
      formaPagamento: r.formaPagamento ?? 'Não informado',
      quantidade: Number(r.quantidade),
      totalVendido: Math.round(Number(r.totalVendido) * 100) / 100,
    }));
  }

  /**
   * Vendas agrupadas por hora do dia de hoje.
   */
  async getSalesByHour() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    type HourRow = { hora: number; vendas: bigint; valor: string };

    const rows = await prisma.$queryRaw<HourRow[]>(
      Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM s."createdAt")::int AS hora,
          COUNT(s.id)::bigint                    AS vendas,
          COALESCE(SUM(s.total), 0)::text        AS valor
        FROM sales s
        WHERE s.status = 'FINALIZADA'
          AND s."createdAt" >= ${inicioHoje}
        GROUP BY hora
        ORDER BY hora
      `
    );

    const byHour = new Map(
      rows.map((r) => [Number(r.hora), { vendas: Number(r.vendas), valor: parseFloat(r.valor) }])
    );

    return Array.from({ length: 24 }, (_, h) => ({
      hora: `${h.toString().padStart(2, '0')}h`,
      vendas: byHour.get(h)?.vendas ?? 0,
      valor: byHour.get(h)?.valor ?? 0,
    }));
  }

  /**
   * Clientes que mais compraram (por valor total gasto).
   */
  async getTopCustomers(limit: number = 10) {
    const rows = await prisma.$queryRaw<TopCustomerRow[]>(
      Prisma.sql`
        SELECT
          c.id,
          c.nome,
          c.cpf,
          c.email,
          COUNT(DISTINCT s.id)::bigint         AS "quantidadeCompras",
          SUM(s.total - s.desconto)            AS "valorGasto",
          AVG(s.total - s.desconto)            AS "ticketMedio",
          MAX(s."createdAt")                   AS "ultimaCompra"
        FROM customers c
        JOIN sales s ON s."customerId" = c.id
        WHERE s.status = 'FINALIZADA'
          AND c.ativo = true
        GROUP BY c.id, c.nome, c.cpf, c.email
        ORDER BY "valorGasto" DESC
        LIMIT ${limit}
      `
    );

    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      cpf: r.cpf,
      email: r.email,
      quantidadeCompras: Number(r.quantidadeCompras),
      valorGasto: Math.round(Number(r.valorGasto) * 100) / 100,
      ticketMedio: Math.round(Number(r.ticketMedio) * 100) / 100,
      ultimaCompra: r.ultimaCompra,
    }));
  }
}
