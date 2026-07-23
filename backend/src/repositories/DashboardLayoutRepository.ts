import { DashboardLayout } from '@prisma/client';
import { prisma } from '../config/database';

export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'vendas-dia',     type: 'vendas_dia',     x: 0, y: 0, w: 3, h: 2, visible: true },
  { id: 'faturamento',    type: 'faturamento',    x: 3, y: 0, w: 3, h: 2, visible: true },
  { id: 'lucro',          type: 'lucro',          x: 6, y: 0, w: 3, h: 2, visible: true },
  { id: 'caixa',          type: 'caixa',          x: 9, y: 0, w: 3, h: 2, visible: true },
  { id: 'estoque-critico',type: 'estoque_critico',x: 0, y: 2, w: 4, h: 3, visible: true },
  { id: 'top-produtos',   type: 'top_produtos',   x: 4, y: 2, w: 4, h: 3, visible: true },
  { id: 'vendas-hora',    type: 'vendas_hora',    x: 8, y: 2, w: 4, h: 3, visible: true },
  { id: 'clientes-recorrentes', type: 'clientes_recorrentes', x: 0, y: 5, w: 6, h: 3, visible: true },
  { id: 'metas',          type: 'metas',          x: 6, y: 5, w: 6, h: 3, visible: true },
  { id: 'calendario',     type: 'calendario',     x: 0, y: 8, w: 12, h: 4, visible: true },
];

export class DashboardLayoutRepository {
  async findByUser(userId: string): Promise<DashboardLayout | null> {
    return prisma.dashboardLayout.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async findAll(userId: string): Promise<DashboardLayout[]> {
    return prisma.dashboardLayout.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createDefault(userId: string, companyId?: string): Promise<DashboardLayout> {
    return prisma.dashboardLayout.create({
      data: {
        userId,
        companyId,
        nome: 'Default',
        isDefault: true,
        widgets: DEFAULT_WIDGETS as any,
      },
    });
  }

  async upsertDefault(userId: string, widgets: WidgetConfig[], companyId?: string): Promise<DashboardLayout> {
    const existing = await this.findByUser(userId);
    if (existing) {
      return prisma.dashboardLayout.update({
        where: { id: existing.id },
        data: { widgets: widgets as any },
      });
    }
    return prisma.dashboardLayout.create({
      data: { userId, companyId, nome: 'Default', isDefault: true, widgets: widgets as any },
    });
  }

  async resetToDefault(userId: string): Promise<DashboardLayout> {
    const existing = await this.findByUser(userId);
    if (existing) {
      return prisma.dashboardLayout.update({
        where: { id: existing.id },
        data: { widgets: DEFAULT_WIDGETS as any },
      });
    }
    return this.createDefault(userId);
  }
}
