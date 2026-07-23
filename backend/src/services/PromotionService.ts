import { TipoPromocao } from '@prisma/client';
import { PromotionRepository } from '../repositories/PromotionRepository';
import { AppError } from '../utils/AppError';

export class PromotionService {
  private promotionRepository: PromotionRepository;

  constructor() {
    this.promotionRepository = new PromotionRepository();
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
    vigente?: boolean;
  }) {
    return this.promotionRepository.findAll(params);
  }

  async findById(id: string) {
    const promo = await this.promotionRepository.findById(id);
    if (!promo) throw new AppError('Promoção não encontrada.', 404);
    return promo;
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
    if (data.dataFim && data.dataFim <= data.dataInicio) {
      throw new AppError('A data de término deve ser posterior à data de início.', 400);
    }
    return this.promotionRepository.create(data);
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
    const existing = await this.promotionRepository.findById(id);
    if (!existing) throw new AppError('Promoção não encontrada.', 404);

    const inicio = data.dataInicio ?? existing.dataInicio;
    const fim = data.dataFim !== undefined ? data.dataFim : existing.dataFim;
    if (fim && fim <= inicio) {
      throw new AppError('A data de término deve ser posterior à data de início.', 400);
    }

    return this.promotionRepository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.promotionRepository.findById(id);
    if (!existing) throw new AppError('Promoção não encontrada.', 404);
    await this.promotionRepository.delete(id);
  }

  async getVigentesParaProduto(productId: string) {
    return this.promotionRepository.findVigentesParaProduto(productId);
  }
}
