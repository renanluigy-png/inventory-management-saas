import { FormaPagamento, StatusVenda } from '@prisma/client';
import {
  SaleRepository,
  SaleFull,
  SaleList,
  FindAllSalesParams,
} from '../repositories/SaleRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { AppError } from '../utils/AppError';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface CriarVendaDTO {
  userId: string;
  customerId?: string;
  formaPagamento?: FormaPagamento;
  observacao?: string;
}

export interface AtualizarVendaDTO {
  customerId?: string | null;
  formaPagamento?: FormaPagamento;
  desconto?: number;
  observacao?: string | null;
}

export interface AdicionarItemDTO {
  // Pelo menos um identificador de produto deve ser fornecido
  productId?: string;
  codigoBarras?: string;
  sku?: string;
  quantidade: number;
  desconto?: number;
}

export interface AtualizarItemDTO {
  quantidade?: number;
  desconto?: number;
}

export interface FinalizarDTO {
  formaPagamento?: FormaPagamento;
  ip?: string;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class SaleService {
  private saleRepository: SaleRepository;
  private productRepository: ProductRepository;
  private customerRepository: CustomerRepository;

  constructor() {
    this.saleRepository = new SaleRepository();
    this.productRepository = new ProductRepository();
    this.customerRepository = new CustomerRepository();
  }

  // ----------------------------------------------------------------
  // Leitura
  // ----------------------------------------------------------------

  async findAll(params: FindAllSalesParams): Promise<{
    data: SaleList[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.saleRepository.findAll(params);
  }

  async findById(id: string): Promise<SaleFull> {
    const sale = await this.saleRepository.findById(id);
    if (!sale) throw new AppError('Venda não encontrada.', 404);
    return sale;
  }

  // ----------------------------------------------------------------
  // Abertura de venda
  // ----------------------------------------------------------------

  async criarVenda(dto: CriarVendaDTO): Promise<SaleFull> {
    if (dto.customerId) {
      await this.validarCliente(dto.customerId);
    }

    return this.saleRepository.create({
      userId: dto.userId,
      customerId: dto.customerId,
      formaPagamento: dto.formaPagamento,
      observacao: dto.observacao,
    });
  }

  // ----------------------------------------------------------------
  // Atualização do cabeçalho
  // ----------------------------------------------------------------

  async atualizarVenda(id: string, dto: AtualizarVendaDTO): Promise<SaleFull> {
    const sale = await this.findById(id);
    this.garantirAberta(sale);

    // Valida o novo cliente se for alterado
    if (dto.customerId) {
      await this.validarCliente(dto.customerId);
    }

    // Valida que o desconto geral não supera o total bruto
    if (dto.desconto !== undefined) {
      const totalAtual = Number(sale.total);
      if (dto.desconto > totalAtual) {
        throw new AppError(
          `O desconto (${dto.desconto}) não pode ser maior que o total da venda (${totalAtual}).`,
          422
        );
      }
    }

    return this.saleRepository.update(id, dto);
  }

  // ----------------------------------------------------------------
  // Gerenciamento de itens
  // ----------------------------------------------------------------

  async adicionarItem(saleId: string, dto: AdicionarItemDTO): Promise<SaleFull> {
    const sale = await this.findById(saleId);
    this.garantirAberta(sale);

    // Resolve o produto pelo identificador fornecido
    const product = await this.resolverProduto(dto);
    if (!product) throw new AppError('Produto não encontrado.', 404);
    if (!product.ativo) throw new AppError('Produto inativo e não pode ser vendido.', 422);

    const desconto = dto.desconto ?? 0;
    const precoUnit = Number(product.preco);
    const subtotal = Math.round((precoUnit * dto.quantidade - desconto) * 100) / 100;

    if (subtotal < 0) {
      throw new AppError(
        `O desconto (${desconto}) não pode ser maior que o valor do item (${precoUnit * dto.quantidade}).`,
        422
      );
    }

    // Se o produto já está na venda, incrementa a quantidade (comportamento PDV padrão)
    const itemExistente = sale.itens.find((i) => i.productId === product.id);
    if (itemExistente) {
      const novaQuantidade = itemExistente.quantidade + dto.quantidade;
      const descontoExistente = Number(itemExistente.desconto);
      return this.saleRepository.updateItem(saleId, itemExistente.id, {
        quantidade: novaQuantidade,
        desconto: descontoExistente,
        precoUnit,
        quantidadeAtual: itemExistente.quantidade,
        descontoAtual: descontoExistente,
      });
    }

    return this.saleRepository.addItem(saleId, {
      productId: product.id,
      precoUnit,
      quantidade: dto.quantidade,
      desconto,
      subtotal,
    });
  }

  async atualizarItem(
    saleId: string,
    itemId: string,
    dto: AtualizarItemDTO
  ): Promise<SaleFull> {
    const sale = await this.findById(saleId);
    this.garantirAberta(sale);

    const item = sale.itens.find((i) => i.id === itemId);
    if (!item) throw new AppError('Item não encontrado nesta venda.', 404);

    const novaQuantidade = dto.quantidade ?? item.quantidade;
    const novoDesconto = dto.desconto ?? Number(item.desconto);
    const precoUnit = Number(item.precoUnit);
    const novoSubtotal = precoUnit * novaQuantidade - novoDesconto;

    if (novoSubtotal < 0) {
      throw new AppError(
        `O desconto (${novoDesconto}) não pode ser maior que o valor do item (${precoUnit * novaQuantidade}).`,
        422
      );
    }

    return this.saleRepository.updateItem(saleId, itemId, {
      quantidade: dto.quantidade,
      desconto: dto.desconto,
      precoUnit,
      quantidadeAtual: item.quantidade,
      descontoAtual: Number(item.desconto),
    });
  }

  async removerItem(saleId: string, itemId: string): Promise<SaleFull> {
    const sale = await this.findById(saleId);
    this.garantirAberta(sale);

    const item = sale.itens.find((i) => i.id === itemId);
    if (!item) throw new AppError('Item não encontrado nesta venda.', 404);

    return this.saleRepository.removeItem(saleId, itemId);
  }

  // ----------------------------------------------------------------
  // Finalização
  // ----------------------------------------------------------------

  async finalizar(saleId: string, userId: string, dto: FinalizarDTO): Promise<SaleFull> {
    const sale = await this.findById(saleId);
    this.garantirAberta(sale);

    if (sale.itens.length === 0) {
      throw new AppError('Não é possível finalizar uma venda sem itens.', 422);
    }

    // Usa a forma de pagamento do body ou a já salva na venda
    const metodoPagamento = dto.formaPagamento ?? sale.formaPagamento ?? undefined;
    if (!metodoPagamento) {
      throw new AppError(
        'Forma de pagamento é obrigatória. Informe no body ou atualize a venda antes de finalizar.',
        422
      );
    }

    // Pré-validação de estoque (dentro da transação do repository também é revalidado)
    for (const item of sale.itens) {
      if (item.product.estoque < item.quantidade) {
        throw new AppError(
          `Estoque insuficiente para "${item.product.nome}". ` +
            `Disponível: ${item.product.estoque} ${item.product.unidade}. ` +
            `Necessário: ${item.quantidade} ${item.product.unidade}.`,
          422
        );
      }
    }

    return this.saleRepository.finalize({
      saleId,
      userId,
      formaPagamento: metodoPagamento,
      ip: dto.ip,
    });
  }

  // ----------------------------------------------------------------
  // Cancelamento
  // ----------------------------------------------------------------

  async cancelar(saleId: string, observacao?: string): Promise<SaleFull> {
    const sale = await this.findById(saleId);

    if (sale.status !== StatusVenda.ABERTA) {
      throw new AppError(
        `Apenas vendas com status ABERTA podem ser canceladas. Status atual: ${sale.status}.`,
        422
      );
    }

    return this.saleRepository.cancel(saleId, observacao);
  }

  // ----------------------------------------------------------------
  // Helpers privados
  // ----------------------------------------------------------------

  private garantirAberta(sale: SaleFull): void {
    if (sale.status !== StatusVenda.ABERTA) {
      throw new AppError(
        `Esta operação é permitida apenas em vendas ABERTAS. Status atual: ${sale.status}.`,
        422
      );
    }
  }

  private async validarCliente(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) throw new AppError('Cliente não encontrado.', 404);
    if (!customer.ativo) throw new AppError('Cliente inativo.', 422);
  }

  // Resolve o produto pelo primeiro identificador válido fornecido
  private async resolverProduto(dto: AdicionarItemDTO) {
    if (dto.productId) {
      return this.productRepository.findById(dto.productId);
    }

    if (dto.codigoBarras) {
      return this.productRepository.findByCodigoBarras(dto.codigoBarras);
    }

    if (dto.sku) {
      // findBySku retorna apenas { id, sku } — busca completa pelo ID
      const skuRef = await this.productRepository.findBySku(dto.sku);
      if (!skuRef) return null;
      return this.productRepository.findById(skuRef.id);
    }

    return null;
  }
}
