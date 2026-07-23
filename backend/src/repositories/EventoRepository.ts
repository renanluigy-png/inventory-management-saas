import { Evento, EventoTipo, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateEventoInput {
  companyId?: string;
  userId: string;
  titulo: string;
  descricao?: string;
  tipo?: EventoTipo;
  inicio: Date;
  fim?: Date;
  diaTodo?: boolean;
  cor?: string;
  entidadeId?: string;
  entidadeTipo?: string;
}

export interface FindEventosParams {
  userId?: string;
  companyId?: string;
  tipo?: EventoTipo;
  concluido?: boolean;
  inicio?: Date;
  fim?: Date;
}

export class EventoRepository {
  async findAll(params: FindEventosParams = {}) {
    const { userId, companyId, tipo, concluido, inicio, fim } = params;

    const where: Prisma.EventoWhereInput = {
      ...(userId && { userId }),
      ...(companyId && { companyId }),
      ...(tipo && { tipo }),
      ...(concluido !== undefined && { concluido }),
      ...(inicio || fim
        ? {
            inicio: {
              ...(inicio && { gte: inicio }),
              ...(fim && { lte: fim }),
            },
          }
        : {}),
    };

    return prisma.evento.findMany({
      where,
      orderBy: { inicio: 'asc' },
      include: { user: { select: { id: true, nome: true } } },
    });
  }

  async findById(id: string): Promise<Evento | null> {
    return prisma.evento.findUnique({ where: { id } });
  }

  async findProximos(userId: string, companyId: string | undefined, days = 7) {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return prisma.evento.findMany({
      where: {
        OR: [{ userId }, ...(companyId ? [{ companyId }] : [])],
        inicio: { gte: now, lte: limit },
        concluido: false,
      },
      orderBy: { inicio: 'asc' },
      take: 10,
    });
  }

  async create(data: CreateEventoInput): Promise<Evento> {
    return prisma.evento.create({ data });
  }

  async update(id: string, data: Partial<CreateEventoInput> & { concluido?: boolean }): Promise<Evento> {
    return prisma.evento.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.evento.delete({ where: { id } });
  }

  async markConcluido(id: string): Promise<Evento> {
    return prisma.evento.update({ where: { id }, data: { concluido: true } });
  }
}
