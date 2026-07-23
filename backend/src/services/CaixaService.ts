import { TipoMovimentacaoCaixa } from '@prisma/client';
import { CaixaRepository } from '../repositories/CaixaRepository';
import { AppError } from '../utils/AppError';

export class CaixaService {
  private caixaRepository: CaixaRepository;

  constructor() {
    this.caixaRepository = new CaixaRepository();
  }

  async getStatus() {
    const caixa = await this.caixaRepository.findAberto();
    if (!caixa) return { aberto: false, caixa: null };

    const saldoAtual = await this.caixaRepository.getSaldoAtual(caixa.id);
    return { aberto: true, caixa: { ...caixa, saldoAtual } };
  }

  async findAll(params: { page?: number; limit?: number }) {
    return this.caixaRepository.findAll(params);
  }

  async findById(id: string) {
    const caixa = await this.caixaRepository.findById(id);
    if (!caixa) throw new AppError('Caixa não encontrado.', 404);
    const saldoAtual = await this.caixaRepository.getSaldoAtual(id);
    return { ...caixa, saldoAtual };
  }

  async abrir(userId: string, saldoInicial: number, observacao?: string) {
    const aberto = await this.caixaRepository.findAberto();
    if (aberto) {
      throw new AppError('Já existe um caixa aberto. Feche-o antes de abrir um novo.', 409);
    }
    return this.caixaRepository.abrir({ userId, saldoInicial, observacao });
  }

  async fechar(id: string, saldoFinal: number, observacao?: string) {
    const caixa = await this.caixaRepository.findById(id);
    if (!caixa) throw new AppError('Caixa não encontrado.', 404);
    if (caixa.status !== 'ABERTO') throw new AppError('Este caixa já está fechado.', 400);
    return this.caixaRepository.fechar(id, { saldoFinal, observacao });
  }

  async sangria(id: string, valor: number, descricao?: string) {
    const caixa = await this.caixaRepository.findById(id);
    if (!caixa) throw new AppError('Caixa não encontrado.', 404);
    if (caixa.status !== 'ABERTO') throw new AppError('Caixa não está aberto.', 400);

    const saldo = await this.caixaRepository.getSaldoAtual(id);
    if (valor > saldo) throw new AppError('Valor de sangria superior ao saldo disponível.', 400);

    return this.caixaRepository.addMovimentacao({
      caixaId: id,
      tipo: TipoMovimentacaoCaixa.SANGRIA,
      valor,
      descricao,
    });
  }

  async suprimento(id: string, valor: number, descricao?: string) {
    const caixa = await this.caixaRepository.findById(id);
    if (!caixa) throw new AppError('Caixa não encontrado.', 404);
    if (caixa.status !== 'ABERTO') throw new AppError('Caixa não está aberto.', 400);

    return this.caixaRepository.addMovimentacao({
      caixaId: id,
      tipo: TipoMovimentacaoCaixa.SUPRIMENTO,
      valor,
      descricao,
    });
  }
}
