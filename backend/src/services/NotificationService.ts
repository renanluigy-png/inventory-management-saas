import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface CreateNotificationData {
  userId?: string;
  titulo: string;
  mensagem: string;
  tipo?: NotificationType;
  link?: string;
}

export class NotificationService {
  async create(data: CreateNotificationData) {
    return prisma.notification.create({ data });
  }

  async createBulk(notifications: CreateNotificationData[]) {
    return prisma.notification.createMany({ data: notifications });
  }

  async findByUser(
    userId: string,
    params: { page?: number; limit?: number; apenasNaoLidas?: boolean }
  ) {
    const { page = 1, limit = 20, apenasNaoLidas } = params;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ userId }, { userId: null }],
      ...(apenasNaoLidas && { lida: false }),
    };

    const [total, items, naoLidas] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { OR: [{ userId }, { userId: null }], lida: false } }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), naoLidas },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new AppError('Notificação não encontrada.', 404);
    if (notif.userId && notif.userId !== userId) {
      throw new AppError('Sem permissão para marcar esta notificação.', 403);
    }
    return prisma.notification.update({ where: { id }, data: { lida: true } });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { OR: [{ userId }, { userId: null }], lida: false },
      data: { lida: true },
    });
  }

  async delete(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new AppError('Notificação não encontrada.', 404);
    if (notif.userId && notif.userId !== userId) {
      throw new AppError('Sem permissão para excluir esta notificação.', 403);
    }
    await prisma.notification.delete({ where: { id } });
  }

  async checkAndCreateAlerts() {
    const agora = new Date();

    // Produtos com estoque crítico (abaixo do mínimo)
    const produtosCriticos = await prisma.product.findMany({
      where: { ativo: true, estoque: { gt: 0 }, estoqueMinimo: { gt: 0 } },
      select: { id: true, nome: true, estoque: true, estoqueMinimo: true },
    });

    const criticos = produtosCriticos.filter((p) => p.estoque <= p.estoqueMinimo);

    if (criticos.length > 0) {
      await prisma.notification.create({
        data: {
          titulo: 'Estoque Crítico',
          mensagem: `${criticos.length} produto(s) com estoque abaixo do mínimo: ${criticos
            .slice(0, 3)
            .map((p) => p.nome)
            .join(', ')}${criticos.length > 3 ? '...' : ''}.`,
          tipo: 'warning',
          link: '/stock',
        },
      });
    }

    // Promoções expirando em 24h
    const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    const promoçõesExpirando = await prisma.promocao.findMany({
      where: {
        ativo: true,
        dataFim: { gte: agora, lte: amanha },
      },
      select: { id: true, nome: true, dataFim: true },
    });

    if (promoçõesExpirando.length > 0) {
      await prisma.notification.create({
        data: {
          titulo: 'Promoções Expirando',
          mensagem: `${promoçõesExpirando.length} promoção(ões) expiram nas próximas 24h: ${promoçõesExpirando
            .map((p) => p.nome)
            .join(', ')}.`,
          tipo: 'warning',
          link: '/promotions',
        },
      });
    }
  }
}
