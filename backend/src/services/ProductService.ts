import path from 'path';
import fs from 'fs';
import { Prisma, TipoMovimentacaoEstoque } from '@prisma/client';
import { ProductRepository } from '../repositories/ProductRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { AppError } from '../utils/AppError';
import { gerarSKU } from '../utils/sku';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface CreateProductDTO {
  sku?: string;
  nome: string;
  descricao?: string;
  preco: number;
  precoCusto?: number;
  estoque?: number;
  estoqueMinimo?: number;
  codigoBarras?: string;
  unidade?: string;
  categoryId?: string;
  companyId?: string | null;
}

export interface UpdateProductDTO {
  sku?: string | null;
  nome?: string;
  descricao?: string | null;
  preco?: number;
  precoCusto?: number | null;
  estoque?: number;
  estoqueMinimo?: number;
  codigoBarras?: string | null;
  unidade?: string;
  categoryId?: string | null;
  ativo?: boolean;
}

export interface FindAllProductParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  ativo?: boolean;
  orderBy?: 'nome' | 'preco' | 'estoque' | 'createdAt';
  order?: 'asc' | 'desc';
  companyId?: string | null;
}

export interface AjusteEstoqueDTO {
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade?: number;
  novoEstoque?: number;
  motivo?: string;
  userId: string;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.categoryRepository = new CategoryRepository();
  }

  // ----------------------------------------------------------------
  // Leitura
  // ----------------------------------------------------------------

  async findAll(params: FindAllProductParams) {
    return this.productRepository.findAll(params);
  }

  async findById(id: string) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new AppError('Produto não encontrado.', 404);
    }

    return product;
  }

  async findByCodigoBarras(codigoBarras: string) {
    const product = await this.productRepository.findByCodigoBarras(codigoBarras);

    if (!product) {
      throw new AppError('Nenhum produto encontrado com este código de barras.', 404);
    }

    return product;
  }

  async findComEstoqueBaixo(params?: { page?: number; limit?: number; companyId?: string | null }) {
    return this.productRepository.findComEstoqueBaixo(params);
  }

  // ----------------------------------------------------------------
  // Estoque
  // ----------------------------------------------------------------

  async consultarEstoque(id: string, params: { page: number; limit: number }) {
    const result = await this.productRepository.consultarEstoque(id, params);

    if (!result) {
      throw new AppError('Produto não encontrado.', 404);
    }

    return result;
  }

  async ajustarEstoque(productId: string, dto: AjusteEstoqueDTO) {
    const produto = await this.findById(productId);
    const quantAnterior = produto.estoque;
    let quantNova: number;
    let quantidadeMovimentada: number;

    if (dto.tipo === 'AJUSTE') {
      quantNova = dto.novoEstoque!;
      quantidadeMovimentada = Math.abs(quantNova - quantAnterior);
    } else if (dto.tipo === 'ENTRADA') {
      quantidadeMovimentada = dto.quantidade!;
      quantNova = quantAnterior + quantidadeMovimentada;
    } else {
      // SAIDA
      quantidadeMovimentada = dto.quantidade!;
      quantNova = quantAnterior - quantidadeMovimentada;
      if (quantNova < 0) {
        throw new AppError(
          `Estoque insuficiente. Estoque atual: ${quantAnterior}. Saída solicitada: ${quantidadeMovimentada}.`,
          422
        );
      }
    }

    const { movimentacao, produto: produtoAtualizado } =
      await this.productRepository.ajustarEstoque({
        productId,
        userId: dto.userId,
        tipo: dto.tipo as TipoMovimentacaoEstoque,
        quantidade: quantidadeMovimentada,
        quantAnterior,
        quantNova,
        motivo: dto.motivo,
      });

    return {
      estoqueAnterior: quantAnterior,
      estoqueAtual: produtoAtualizado.estoque,
      produto: produtoAtualizado,
      movimentacao,
    };
  }

  // ----------------------------------------------------------------
  // Imagem
  // ----------------------------------------------------------------

  async updateImagem(id: string, imagemUrl: string) {
    const produto = await this.findById(id);

    // Remove o arquivo anterior do disco se existir
    if (produto.imagemUrl) {
      const caminhoAntigo = path.join(process.cwd(), produto.imagemUrl);
      if (fs.existsSync(caminhoAntigo)) {
        fs.unlinkSync(caminhoAntigo);
      }
    }

    return this.productRepository.update(id, { imagemUrl });
  }

  async removeImagem(id: string) {
    const produto = await this.findById(id);

    if (!produto.imagemUrl) {
      throw new AppError('Este produto não possui imagem cadastrada.', 404);
    }

    const caminhoArquivo = path.join(process.cwd(), produto.imagemUrl);
    if (fs.existsSync(caminhoArquivo)) {
      fs.unlinkSync(caminhoArquivo);
    }

    await this.productRepository.update(id, { imagemUrl: null });
  }

  // ----------------------------------------------------------------
  // Escrita
  // ----------------------------------------------------------------

  async create(dto: CreateProductDTO) {
    if (dto.categoryId) {
      const categoriaAtiva = await this.categoryRepository.existsAndActive(dto.categoryId);
      if (!categoriaAtiva) {
        throw new AppError('Categoria não encontrada ou inativa.', 404);
      }
    }

    // SKU: usar o fornecido ou gerar automaticamente com garantia de unicidade
    const sku = dto.sku
      ? await this.validarEUsarSKU(dto.sku)
      : await this.gerarSkuUnico();

    const data: Prisma.ProductCreateInput = {
      sku,
      nome: dto.nome,
      descricao: dto.descricao,
      preco: dto.preco,
      precoCusto: dto.precoCusto,
      estoque: dto.estoque ?? 0,
      estoqueMinimo: dto.estoqueMinimo ?? 0,
      codigoBarras: dto.codigoBarras,
      unidade: dto.unidade ?? 'UN',
      ...(dto.categoryId && {
        category: { connect: { id: dto.categoryId } },
      }),
      ...(dto.companyId && { companyId: dto.companyId }),
    };

    return this.productRepository.create(data);
  }

  async update(id: string, dto: UpdateProductDTO) {
    await this.findById(id);

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      const categoriaAtiva = await this.categoryRepository.existsAndActive(dto.categoryId);
      if (!categoriaAtiva) {
        throw new AppError('Categoria não encontrada ou inativa.', 404);
      }
    }

    // Valida unicidade do novo SKU se fornecido
    if (dto.sku !== undefined && dto.sku !== null) {
      const existente = await this.productRepository.findBySku(dto.sku);
      if (existente && existente.id !== id) {
        throw new AppError('Já existe outro produto com este SKU.', 409);
      }
    }

    const { categoryId, ...fields } = dto;

    const data: Prisma.ProductUpdateInput = {
      ...(fields.sku !== undefined && { sku: fields.sku }),
      ...(fields.nome !== undefined && { nome: fields.nome }),
      ...(fields.descricao !== undefined && { descricao: fields.descricao }),
      ...(fields.preco !== undefined && { preco: fields.preco }),
      ...(fields.precoCusto !== undefined && { precoCusto: fields.precoCusto }),
      ...(fields.estoque !== undefined && { estoque: fields.estoque }),
      ...(fields.estoqueMinimo !== undefined && { estoqueMinimo: fields.estoqueMinimo }),
      ...(fields.codigoBarras !== undefined && { codigoBarras: fields.codigoBarras }),
      ...(fields.unidade !== undefined && { unidade: fields.unidade }),
      ...(fields.ativo !== undefined && { ativo: fields.ativo }),
      ...(categoryId !== undefined && {
        category: categoryId
          ? { connect: { id: categoryId } }
          : { disconnect: true },
      }),
    };

    return this.productRepository.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.productRepository.softDelete(id);
  }

  // ----------------------------------------------------------------
  // Helpers privados
  // ----------------------------------------------------------------

  private async gerarSkuUnico(): Promise<string> {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const sku = gerarSKU();
      const existente = await this.productRepository.findBySku(sku);
      if (!existente) return sku;
    }
    throw new AppError(
      'Não foi possível gerar um SKU único. Tente novamente.',
      500
    );
  }

  private async validarEUsarSKU(sku: string): Promise<string> {
    const existente = await this.productRepository.findBySku(sku);
    if (existente) {
      throw new AppError('Já existe um produto com este SKU.', 409);
    }
    return sku;
  }
}
