import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// Campos de ordenação permitidos
export type CustomerOrderField = 'nome' | 'createdAt' | 'updatedAt';

export interface FindAllCustomerParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  orderBy?: CustomerOrderField;
  order?: 'asc' | 'desc';
  companyId?: string | null;
}

export class CustomerRepository {
  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { vendas: true } },
      },
    });
  }

  async findByCpf(cpf: string) {
    return prisma.customer.findUnique({
      where: { cpf },
      select: { id: true, cpf: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.customer.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  async findAll(params?: FindAllCustomerParams) {
    const {
      page = 1,
      limit = 20,
      search,
      ativo,
      orderBy = 'nome',
      order = 'asc',
      companyId,
    } = params ?? {};
    const skip = (page - 1) * limit;

    // Para CPF/telefone: busca pelos dígitos da pesquisa (remove formatação)
    const digitos = search ? search.replace(/\D/g, '') : '';

    const where: Prisma.CustomerWhereInput = {
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          // Busca CPF e telefone pelos dígitos (mínimo 3 para evitar match em tudo)
          ...(digitos.length >= 3
            ? [
                { cpf: { contains: digitos } },
                { telefone: { contains: digitos } },
              ]
            : []),
        ],
      }),
      ...(ativo !== undefined && { ativo }),
      ...(companyId != null && { companyId }),
    };

    // Monta orderBy de forma type-safe
    const orderByClause: Prisma.CustomerOrderByWithRelationInput =
      orderBy === 'createdAt'
        ? { createdAt: order }
        : orderBy === 'updatedAt'
          ? { updatedAt: order }
          : { nome: order };

    const [total, data] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          _count: { select: { vendas: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({
      data,
      include: {
        _count: { select: { vendas: true } },
      },
    });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({
      where: { id },
      data,
      include: {
        _count: { select: { vendas: true } },
      },
    });
  }

  // Soft delete: preserva o histórico de vendas no banco
  async softDelete(id: string) {
    return prisma.customer.update({
      where: { id },
      data: { ativo: false },
      include: {
        _count: { select: { vendas: true } },
      },
    });
  }
}
