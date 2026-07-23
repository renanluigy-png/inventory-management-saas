import { TipoMovimentacaoEstoque } from '@prisma/client';
import {
  StockRepository,
  FindAllMovimentacoesParams,
} from '../repositories/StockRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { AppError } from '../utils/AppError';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface FindAllEstoqueParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  ativo?: boolean;
  orderBy?: 'nome' | 'estoque' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface EntradaDTO {
  productId: string;
  quantidade: number;
  motivo?: string;
  userId: string;
  ip?: string;
}

export interface SaidaDTO {
  productId: string;
  quantidade: number;
  motivo?: string;
  userId: string;
  ip?: string;
}

export interface AjusteDTO {
  productId: string;
  novoEstoque: number;
  motivo?: string;
  userId: string;
  ip?: string;
}

export interface BaixaDTO {
  productId: string;
  tipo: 'BAIXA_PERDA' | 'BAIXA_AVARIA';
  quantidade: number;
  motivo: string; // obrigatório: toda baixa exige justificativa
  userId: string;
  ip?: string;
}

export interface DevolucaoDTO {
  productId: string;
  quantidade: number;
  motivo?: string;
  userId: string;
  ip?: string;
}

// Tipos internos para o helper privado
type ExecutarMovimentacaoData = {
  productId: string;
  userId: string;
  ip?: string;
  motivo?: string;
} & (
  | { tipo: 'AJUSTE'; novoEstoque: number; quantidade?: never }
  | { tipo: Exclude<TipoMovimentacaoEstoque, 'AJUSTE'>; quantidade: number; novoEstoque?: never }
);

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class StockService {
  private stockRepository: StockRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.stockRepository = new StockRepository();
    this.productRepository = new ProductRepository();
  }

  // ----------------------------------------------------------------
  // Leitura — visão geral do estoque atual por produto
  // ----------------------------------------------------------------

  async listarEstoque(params: FindAllEstoqueParams) {
    const result = await this.productRepository.findAll({
      page: params.page,
      limit: params.limit,
      search: params.search,
      categoryId: params.categoryId,
      ativo: params.ativo ?? true, // padrão: apenas ativos
      orderBy: params.orderBy as 'nome' | 'estoque' | 'preco' | 'createdAt' | undefined,
      order: params.order,
    });

    // Enriquece cada produto com o status calculado do estoque
    const data = result.data.map((produto) => ({
      ...produto,
      statusEstoque:
        produto.estoque === 0
          ? ('ZERADO' as const)
          : produto.estoque <= produto.estoqueMinimo
          ? ('BAIXO' as const)
          : ('OK' as const),
    }));

    return { data, meta: result.meta };
  }

  // ----------------------------------------------------------------
  // Histórico de movimentações
  // ----------------------------------------------------------------

  async listarHistorico(params: FindAllMovimentacoesParams) {
    return this.stockRepository.findAll(params);
  }

  // ----------------------------------------------------------------
  // Alertas
  // ----------------------------------------------------------------

  async getAlertas() {
    return this.stockRepository.getAlertas();
  }

  // ----------------------------------------------------------------
  // Escritas — cada operação delega ao helper central
  // ----------------------------------------------------------------

  async registrarEntrada(dto: EntradaDTO) {
    return this.executarMovimentacao({
      productId: dto.productId,
      userId: dto.userId,
      ip: dto.ip,
      tipo: 'ENTRADA',
      quantidade: dto.quantidade,
      motivo: dto.motivo,
    });
  }

  async registrarSaida(dto: SaidaDTO) {
    return this.executarMovimentacao({
      productId: dto.productId,
      userId: dto.userId,
      ip: dto.ip,
      tipo: 'SAIDA',
      quantidade: dto.quantidade,
      motivo: dto.motivo,
    });
  }

  async ajustarEstoque(dto: AjusteDTO) {
    return this.executarMovimentacao({
      productId: dto.productId,
      userId: dto.userId,
      ip: dto.ip,
      tipo: 'AJUSTE',
      novoEstoque: dto.novoEstoque,
      motivo: dto.motivo,
    });
  }

  async registrarBaixa(dto: BaixaDTO) {
    return this.executarMovimentacao({
      productId: dto.productId,
      userId: dto.userId,
      ip: dto.ip,
      tipo: dto.tipo, // BAIXA_PERDA ou BAIXA_AVARIA
      quantidade: dto.quantidade,
      motivo: dto.motivo,
    });
  }

  async registrarDevolucao(dto: DevolucaoDTO) {
    return this.executarMovimentacao({
      productId: dto.productId,
      userId: dto.userId,
      ip: dto.ip,
      tipo: 'DEVOLUCAO',
      quantidade: dto.quantidade,
      motivo: dto.motivo,
    });
  }

  // ----------------------------------------------------------------
  // Helper privado — lógica centralizada de movimentação
  // ----------------------------------------------------------------

  private async executarMovimentacao(data: ExecutarMovimentacaoData) {
    const produto = await this.productRepository.findById(data.productId);

    if (!produto) {
      throw new AppError('Produto não encontrado.', 404);
    }

    if (!produto.ativo) {
      throw new AppError(
        'Não é possível movimentar o estoque de um produto inativo.',
        422
      );
    }

    const quantAnterior = produto.estoque;
    let quantNova: number;
    let quantidadeMovimentada: number;

    if (data.tipo === 'AJUSTE') {
      // AJUSTE: define o valor absoluto do novo estoque
      quantNova = data.novoEstoque;
      quantidadeMovimentada = Math.abs(quantNova - quantAnterior);
    } else if (data.tipo === 'ENTRADA' || data.tipo === 'DEVOLUCAO') {
      // Movimentos que adicionam estoque
      quantidadeMovimentada = data.quantidade;
      quantNova = quantAnterior + quantidadeMovimentada;
    } else {
      // SAIDA, VENDA, BAIXA_PERDA, BAIXA_AVARIA — reduzem estoque
      quantidadeMovimentada = data.quantidade;
      quantNova = quantAnterior - quantidadeMovimentada;

      if (quantNova < 0) {
        throw new AppError(
          `Estoque insuficiente. ` +
          `Estoque atual: ${quantAnterior} ${produto.unidade}. ` +
          `Quantidade solicitada: ${quantidadeMovimentada} ${produto.unidade}.`,
          422
        );
      }
    }

    const { movimentacao, produto: produtoAtualizado } =
      await this.stockRepository.criarMovimentacao({
        productId: data.productId,
        userId: data.userId,
        tipo: data.tipo,
        quantidade: quantidadeMovimentada,
        quantAnterior,
        quantNova,
        motivo: data.motivo,
        ip: data.ip,
      });

    return {
      movimentacao,
      produto: produtoAtualizado,
      estoqueAnterior: quantAnterior,
      estoqueAtual: quantNova,
    };
  }
}

// Re-export para uso nos controllers sem import adicional
export type { FindAllMovimentacoesParams };
