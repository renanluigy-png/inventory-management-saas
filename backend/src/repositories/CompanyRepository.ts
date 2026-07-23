import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class CompanyRepository {
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    ativo?: boolean;
  }) {
    const { page = 1, limit = 20, search, ativo } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { nomeFantasia: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(ativo !== undefined && { ativo }),
    };

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { usuarios: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: companies,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        settings: true,
        theme: true,
        _count: { select: { usuarios: true, invites: true } },
      },
    });
  }

  async findByCnpj(cnpj: string) {
    return prisma.company.findUnique({ where: { cnpj } });
  }

  async findByEmail(email: string) {
    return prisma.company.findUnique({ where: { email } });
  }

  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({
      data,
      include: { subscription: { include: { plan: true } }, settings: true, theme: true },
    });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({
      where: { id },
      data,
      include: { subscription: { include: { plan: true } }, settings: true, theme: true },
    });
  }

  async countByStatus() {
    const [total, ativas, trial, suspensas, canceladas] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({
        where: { ativo: true, subscription: { status: 'ATIVA' } },
      }),
      prisma.company.count({
        where: { subscription: { status: 'TRIAL' } },
      }),
      prisma.company.count({
        where: { subscription: { status: 'SUSPENSA' } },
      }),
      prisma.company.count({
        where: { subscription: { status: 'CANCELADA' } },
      }),
    ]);
    return { total, ativas, trial, suspensas, canceladas };
  }

  async countNewLastMonth() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return prisma.company.count({ where: { createdAt: { gte: start } } });
  }
}
