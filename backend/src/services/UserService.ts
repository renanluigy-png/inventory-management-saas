import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';
import { prisma } from '../config/database';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    ativo?: boolean;
  }) {
    return this.userRepository.findAll(params);
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    return user;
  }

  async create(data: {
    nome: string;
    email: string;
    senha: string;
    role?: string;
  }) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new AppError('E-mail já cadastrado.', 409);

    const senhaHash = await bcrypt.hash(data.senha, 12);

    return this.userRepository.create({
      nome: data.nome,
      email: data.email,
      senha: senhaHash,
      role: data.role as Prisma.UserCreateInput['role'],
    });
  }

  async update(
    id: string,
    data: { nome?: string; email?: string; role?: string; ativo?: boolean }
  ) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new AppError('Usuário não encontrado.', 404);

    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing) throw new AppError('E-mail já está em uso.', 409);
    }

    return this.userRepository.update(id, data as Prisma.UserUpdateInput);
  }

  async resetPasswordByAdmin(
    targetId: string,
    novaSenha: string,
    adminId: string
  ) {
    const target = await this.userRepository.findById(targetId);
    if (!target) throw new AppError('Usuário não encontrado.', 404);
    if (targetId === adminId) {
      throw new AppError('Use a rota change-password para alterar sua própria senha.', 400);
    }

    const hash = await bcrypt.hash(novaSenha, 12);
    await prisma.user.update({ where: { id: targetId }, data: { senha: hash } });
    // Revoga sessões do usuário afetado
    await prisma.refreshToken.updateMany({
      where: { userId: targetId },
      data: { revogado: true },
    });
  }

  async softDelete(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new AppError('Você não pode desativar sua própria conta.', 400);
    }
    const user = await this.userRepository.findById(id);
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    return this.userRepository.softDelete(id);
  }

  async reactivate(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    return this.userRepository.update(id, { ativo: true });
  }
}
