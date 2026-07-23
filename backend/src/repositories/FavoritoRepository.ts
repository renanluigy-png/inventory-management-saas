import { Favorito } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateFavoritoInput {
  userId: string;
  companyId?: string;
  tipo: string;
  entidadeId?: string;
  label: string;
  url?: string;
  dados?: Record<string, unknown>;
  ordem?: number;
}

export class FavoritoRepository {
  async findByUser(userId: string): Promise<Favorito[]> {
    return prisma.favorito.findMany({
      where: { userId },
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string): Promise<Favorito | null> {
    return prisma.favorito.findUnique({ where: { id } });
  }

  async findByTipo(userId: string, tipo: string): Promise<Favorito[]> {
    return prisma.favorito.findMany({
      where: { userId, tipo },
      orderBy: { ordem: 'asc' },
    });
  }

  async isFavorito(userId: string, tipo: string, entidadeId: string): Promise<boolean> {
    const f = await prisma.favorito.findUnique({
      where: { userId_tipo_entidadeId: { userId, tipo, entidadeId } },
    });
    return !!f;
  }

  async create(data: CreateFavoritoInput): Promise<Favorito> {
    const count = await prisma.favorito.count({ where: { userId: data.userId, tipo: data.tipo } });
    return prisma.favorito.create({
      data: { ...data, dados: data.dados as any, ordem: data.ordem ?? count },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.favorito.delete({ where: { id } });
  }

  async deleteByEntidade(userId: string, tipo: string, entidadeId: string): Promise<void> {
    await prisma.favorito.deleteMany({
      where: { userId, tipo, entidadeId },
    });
  }

  async updateOrdem(userId: string, ordens: { id: string; ordem: number }[]): Promise<void> {
    await prisma.$transaction(
      ordens.map(({ id, ordem }) =>
        prisma.favorito.update({ where: { id }, data: { ordem } })
      )
    );
  }
}
