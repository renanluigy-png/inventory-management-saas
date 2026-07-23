import { FormaPagamento, Prisma, StatusVenda } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

// ----------------------------------------------------------------
// Tipo do client dentro de uma transação interativa
// ----------------------------------------------------------------
type PrismaTx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ----------------------------------------------------------------
// Includes compartilhados
// ----------------------------------------------------------------

const includeSaleFull = {
  customer: {
    select: { id: true, nome: true, cpf: true, email: true, telefone: true },
  },
  user: {
    select: { id: true, nome: true },
  },
  itens: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          nome: true,
          unidade: true,
          estoque: true,
          imagemUrl: true,
        },
      },
    },
  },
} satisfies Prisma.SaleInclude;

const includeSaleList = {
  customer: { select: { id: true, nome: true, cpf: true } },
  user: { select: { id: true, nome: true } },
  _count: { select: { itens: true } },
} satisfies Prisma.SaleInclude;

// ----------------------------------------------------------------
// Tipos inferidos
// ----------------------------------------------------------------

export type SaleFull = Prisma.SaleGetPayload<{ include: typeof includeSaleFull }>;
export type SaleList = Prisma.SaleGetPayload<{ include: typeof includeSaleList }>;

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface FindAllSalesParams {
  page?: number;
  limit?: number;
  search?: string;
  numero?: number;
  customerId?: string;
  userId?: string;
  status?: StatusVenda;
  productId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  orderBy?: 'numero' | 'total' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateSaleData {
  userId: string;
  customerId?: string;
  formaPagamento?: FormaPagamento;
  observacao?: string;
}

export interface UpdateSaleData {
  customerId?: string | null;
  formaPagamento?: FormaPagamento;
  desconto?: number;
  observacao?: string | null;
}

export interface AddItemData {
  productId: string;
  precoUnit: number;
  quantidade: number;
  desconto: number;
  subtotal: number;
}

export interface UpdateItemData {
  quantidade?: number;
  desconto?: number;
}

export interface FinalizeData {
  saleId: string;
  userId: string;
  formaPagamento: FormaPagamento;
  ip?: string;
}

// ----------------------------------------------------------------
// Repository
// ----------------------------------------------------------------

export class SaleRepository {
  // Busca uma venda pelo ID com todos os relacionamentos
  async findById(id: string): Promise<SaleFull | null> {
    return prisma.sale.findUnique({
      where: { id },
      include: includeSaleFull,
    });
  }

  // Lista vendas com filtros completos e paginação
  async findAll(params: FindAllSalesParams): Promise<{
    data: SaleList[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      numero,
      customerId,
      userId,
      status,
      productId,
      dataInicio,
      dataFim,
      orderBy = 'numero',
      order = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const dataFimFinal = dataFim
      ? new Date(new Date(dataFim).setHours(23, 59, 59, 999))
      : undefined;

    // Filtros de busca textual (cliente por nome/cpf, ou número de venda)
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
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(userId && { userId }),
      ...(numero && { numero }),
      // Filtra vendas que contenham determinado produto
      ...(productId && { itens: { some: { productId } } }),
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
        : orderBy === 'createdAt'
          ? { createdAt: order }
          : { numero: order };

    const [total, data] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: includeSaleList,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Abre uma nova venda (status ABERTA, total 0)
  async create(data: CreateSaleData): Promise<SaleFull> {
    return prisma.sale.create({
      data: {
        userId: data.userId,
        customerId: data.customerId,
        formaPagamento: data.formaPagamento,
        observacao: data.observacao,
        total: 0,
        desconto: 0,
      },
      include: includeSaleFull,
    });
  }

  // Atualiza campos do cabeçalho da venda (apenas vendas ABERTAS)
  async update(id: string, data: UpdateSaleData): Promise<SaleFull> {
    return prisma.sale.update({
      where: { id },
      data: {
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.formaPagamento !== undefined && { formaPagamento: data.formaPagamento }),
        ...(data.desconto !== undefined && { desconto: data.desconto }),
        ...(data.observacao !== undefined && { observacao: data.observacao }),
      },
      include: includeSaleFull,
    });
  }

  // Adiciona um item à venda e recalcula o total atomicamente
  async addItem(saleId: string, data: AddItemData): Promise<SaleFull> {
    return prisma.$transaction(async (tx) => {
      await tx.saleItem.create({
        data: {
          saleId,
          productId: data.productId,
          precoUnit: data.precoUnit,
          quantidade: data.quantidade,
          desconto: data.desconto,
          subtotal: data.subtotal,
        },
      });

      await this.recalcularTotal(tx, saleId);

      return tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: includeSaleFull,
      });
    });
  }

  // Atualiza um item (quantidade e/ou desconto) e recalcula o total
  async updateItem(
    saleId: string,
    itemId: string,
    data: UpdateItemData & { precoUnit: number; quantidadeAtual: number; descontoAtual: number }
  ): Promise<SaleFull> {
    return prisma.$transaction(async (tx) => {
      const novaQuantidade = data.quantidade ?? data.quantidadeAtual;
      const novoDesconto = data.desconto ?? data.descontoAtual;
      const novoSubtotal =
        Math.round((data.precoUnit * novaQuantidade - novoDesconto) * 100) / 100;

      await tx.saleItem.update({
        where: { id: itemId },
        data: {
          quantidade: novaQuantidade,
          desconto: novoDesconto,
          subtotal: novoSubtotal,
        },
      });

      await this.recalcularTotal(tx, saleId);

      return tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: includeSaleFull,
      });
    });
  }

  // Remove um item da venda e recalcula o total
  async removeItem(saleId: string, itemId: string): Promise<SaleFull> {
    return prisma.$transaction(async (tx) => {
      await tx.saleItem.delete({ where: { id: itemId } });

      await this.recalcularTotal(tx, saleId);

      return tx.sale.findUniqueOrThrow({
        where: { id: saleId },
        include: includeSaleFull,
      });
    });
  }

  // Finaliza a venda:
  // 1. Revalida estoque dentro da transação
  // 2. Atualiza status + formaPagamento
  // 3. Baixa o estoque de cada item (tipo VENDA)
  // 4. Cria movimentação de caixa (se houver caixa aberto para o usuário)
  async finalize(data: FinalizeData): Promise<SaleFull> {
    // Busca a venda com itens e estoque dos produtos FORA da transação
    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: {
        itens: {
          include: {
            product: { select: { id: true, nome: true, estoque: true, unidade: true } },
          },
        },
      },
    });

    if (!sale) throw new AppError('Venda não encontrada.', 404);
    if (sale.status !== 'ABERTA') {
      throw new AppError('Apenas vendas com status ABERTA podem ser finalizadas.', 422);
    }
    if (sale.itens.length === 0) {
      throw new AppError('Não é possível finalizar uma venda sem itens.', 422);
    }

    const totalLiquido =
      Math.round((Number(sale.total) - Number(sale.desconto)) * 100) / 100;

    return prisma.$transaction(async (tx) => {
      // Revalida estoque dentro da transação para consistência sob concorrência
      for (const item of sale.itens) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { estoque: true, nome: true },
        });

        if (!prod) {
          throw new AppError(`Produto "${item.product.nome}" não encontrado.`, 404);
        }
        if (prod.estoque < item.quantidade) {
          throw new AppError(
            `Estoque insuficiente para "${item.product.nome}". ` +
              `Disponível: ${prod.estoque} ${item.product.unidade}. ` +
              `Necessário: ${item.quantidade} ${item.product.unidade}.`,
            422
          );
        }
      }

      // Atualiza status e forma de pagamento
      await tx.sale.update({
        where: { id: data.saleId },
        data: { status: 'FINALIZADA', formaPagamento: data.formaPagamento },
      });

      // Baixa o estoque de cada item e cria o registro de movimentação
      for (const item of sale.itens) {
        const prod = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { estoque: true },
        });

        const estoqueAnterior = prod.estoque;
        const estoqueNovo = estoqueAnterior - item.quantidade;

        await tx.product.update({
          where: { id: item.productId },
          data: { estoque: estoqueNovo },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            productId: item.productId,
            userId: data.userId,
            tipo: 'VENDA',
            quantidade: item.quantidade,
            quantAnterior: estoqueAnterior,
            quantNova: estoqueNovo,
            motivo: `Venda #${sale.numero}`,
            ip: data.ip,
          },
        });
      }

      // Cria movimentação de caixa apenas se houver caixa aberto para o usuário
      const caixa = await tx.caixa.findFirst({
        where: { userId: data.userId, status: 'ABERTO' },
      });

      if (caixa) {
        await tx.caixaMovimentacao.create({
          data: {
            caixaId: caixa.id,
            saleId: data.saleId,
            tipo: 'ENTRADA',
            valor: totalLiquido,
            descricao: `Venda #${sale.numero} — ${data.formaPagamento}`,
          },
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: data.saleId },
        include: includeSaleFull,
      });
    });
  }

  // Cancela uma venda (status → CANCELADA); nunca exclui fisicamente
  async cancel(id: string, observacao?: string): Promise<SaleFull> {
    return prisma.sale.update({
      where: { id },
      data: {
        status: 'CANCELADA',
        ...(observacao !== undefined && { observacao }),
      },
      include: includeSaleFull,
    });
  }

  // ----------------------------------------------------------------
  // Helper privado — recalcula o total da venda a partir dos itens
  // ----------------------------------------------------------------
  private async recalcularTotal(tx: PrismaTx, saleId: string): Promise<void> {
    const { _sum } = await tx.saleItem.aggregate({
      where: { saleId },
      _sum: { subtotal: true },
    });

    await tx.sale.update({
      where: { id: saleId },
      data: { total: _sum.subtotal ?? 0 },
    });
  }
}
