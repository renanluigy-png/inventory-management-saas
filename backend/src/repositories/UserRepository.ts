import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// Campos seguros para retornar ao cliente (exclui senha)
const safeUserSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    ativo?: boolean;
  }) {
    const { page = 1, limit = 20, search, role, ativo } = params ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { nome: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role: role as Prisma.EnumRoleFilter }),
      ...(ativo !== undefined && { ativo }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: safeUserSelect,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  // Soft delete: desativa o usuário sem remover do banco
  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { ativo: false },
      select: safeUserSelect,
    });
  }
}
