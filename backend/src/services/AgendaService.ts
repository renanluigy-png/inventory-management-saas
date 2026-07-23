import { EventoTipo } from '@prisma/client';
import { EventoRepository, CreateEventoInput } from '../repositories/EventoRepository';
import { AppError } from '../utils/AppError';

export class AgendaService {
  private repo: EventoRepository;
  constructor() { this.repo = new EventoRepository(); }

  async findAll(params: {
    userId?: string;
    companyId?: string;
    tipo?: EventoTipo;
    concluido?: boolean;
    inicio?: string;
    fim?: string;
  }) {
    return this.repo.findAll({
      ...params,
      inicio: params.inicio ? new Date(params.inicio) : undefined,
      fim: params.fim ? new Date(params.fim) : undefined,
    });
  }

  async findById(id: string) {
    const evento = await this.repo.findById(id);
    if (!evento) throw new AppError('Evento não encontrado.', 404);
    return evento;
  }

  async findProximos(userId: string, companyId: string | undefined) {
    return this.repo.findProximos(userId, companyId, 7);
  }

  async create(data: CreateEventoInput) {
    if (data.fim && new Date(data.inicio) > new Date(data.fim)) {
      throw new AppError('Início deve ser anterior ao fim.', 400);
    }
    return this.repo.create(data);
  }

  async update(id: string, userId: string, data: Partial<CreateEventoInput> & { concluido?: boolean }) {
    const evento = await this.findById(id);
    if (evento.userId !== userId) throw new AppError('Sem permissão.', 403);
    return this.repo.update(id, data);
  }

  async delete(id: string, userId: string) {
    const evento = await this.findById(id);
    if (evento.userId !== userId) throw new AppError('Sem permissão.', 403);
    await this.repo.delete(id);
  }

  async markConcluido(id: string, userId: string) {
    const evento = await this.findById(id);
    if (evento.userId !== userId) throw new AppError('Sem permissão.', 403);
    return this.repo.markConcluido(id);
  }

  async getEventosMes(userId: string, companyId: string | undefined, ano: number, mes: number) {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);
    return this.repo.findAll({ userId, companyId, inicio, fim });
  }
}
