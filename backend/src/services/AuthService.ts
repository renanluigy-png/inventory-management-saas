import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { JwtPayload, LoginCredentials } from '../types/auth.types';
import { prisma } from '../config/database';
import { sendPasswordResetEmail } from '../utils/email';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_BYTES = 40;
const RESET_TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOpaqueToken(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  private issueAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  private async issueRefreshToken(
    userId: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<string> {
    const raw = generateOpaqueToken(REFRESH_TOKEN_BYTES);
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000);

    await prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
    });

    return raw;
  }

  async login(
    credentials: LoginCredentials,
    meta: { ip?: string; userAgent?: string } = {}
  ) {
    const { email, senha } = credentials;

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('E-mail ou senha incorretos.', 401);
    }

    if (!user.ativo) {
      throw new AppError('Usuário inativo. Entre em contato com o administrador.', 403);
    }

    // Verifica bloqueio temporário
    if (user.bloqueadoAte && user.bloqueadoAte > new Date()) {
      const minutosRestantes = Math.ceil(
        (user.bloqueadoAte.getTime() - Date.now()) / 60000
      );
      throw new AppError(
        `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutosRestantes} minuto(s).`,
        429
      );
    }

    const senhaCorreta = await bcrypt.compare(senha, user.senha);

    if (!senhaCorreta) {
      const novasAttempts = user.loginAttempts + 1;
      const bloqueadoAte =
        novasAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: novasAttempts, ...(bloqueadoAte && { bloqueadoAte }) },
      });

      const tentativasRestantes = MAX_LOGIN_ATTEMPTS - novasAttempts;
      if (tentativasRestantes <= 0) {
        throw new AppError(
          `Conta bloqueada por ${LOCKOUT_MINUTES} minutos após múltiplas tentativas.`,
          429
        );
      }
      throw new AppError(
        `E-mail ou senha incorretos. ${tentativasRestantes} tentativa(s) restante(s).`,
        401
      );
    }

    // Login bem-sucedido: resetar tentativas e registrar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, bloqueadoAte: null, ultimoLogin: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
    };
    const accessToken = this.issueAccessToken(payload);
    const refreshToken = await this.issueRefreshToken(user.id, meta);

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        companyId: user.companyId ?? null,
      },
    };
  }

  async refreshTokens(
    rawRefreshToken: string,
    meta: { ip?: string; userAgent?: string } = {}
  ) {
    const tokenHash = hashToken(rawRefreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revogado || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token inválido ou expirado.', 401);
    }

    // Token rotation: revoga o atual e emite novo par
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revogado: true },
    });

    const user = await this.userRepository.findById(stored.userId);
    if (!user || !user.ativo) {
      throw new AppError('Usuário não encontrado ou inativo.', 401);
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
    };
    const accessToken = this.issueAccessToken(payload);
    const newRefreshToken = await this.issueRefreshToken(user.id, meta);

    return { accessToken, refreshToken: newRefreshToken, expiresIn: env.JWT_EXPIRES_IN };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revogado: true },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revogado: true },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Não revela se o e-mail existe ou não (prevenção de enumeração)
    if (!user || !user.ativo) return;

    // Invalida tokens anteriores
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usado: false },
      data: { usado: true },
    });

    const raw = generateOpaqueToken(RESET_TOKEN_BYTES);
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user.email, user.nome, resetLink);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usado || record.expiresAt < new Date()) {
      throw new AppError('Token de recuperação inválido ou expirado.', 400);
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { senha: hash, loginAttempts: 0, bloqueadoAte: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usado: true },
      }),
      // Revoga todos os refresh tokens após reset de senha
      prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { revogado: true },
      }),
    ]);
  }

  async changePassword(
    userId: string,
    senhaAtual: string,
    novaSenha: string
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(''); // não temos findByIdWithPassword
    // Busca com senha incluída
    const userFull = await prisma.user.findUnique({ where: { id: userId } });

    if (!userFull) throw new AppError('Usuário não encontrado.', 404);

    const correta = await bcrypt.compare(senhaAtual, userFull.senha);
    if (!correta) throw new AppError('Senha atual incorreta.', 401);

    const hash = await bcrypt.hash(novaSenha, 12);
    await prisma.user.update({ where: { id: userId }, data: { senha: hash } });

    // Revoga todos os refresh tokens (força novo login nos outros dispositivos)
    await this.logoutAll(userId);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    return user;
  }

  async registerCompany(
    data: {
      nomeEmpresa: string
      nomeFantasia?: string
      cnpj?: string
      telefoneEmpresa?: string
      nomeAdmin: string
      email: string
      senha: string
      cidade?: string
      estado?: string
    },
    meta: { ip?: string; userAgent?: string } = {}
  ) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new AppError('Este e-mail já está em uso.', 409);

    if (data.cnpj) {
      const cnpjInUse = await prisma.company.findUnique({ where: { cnpj: data.cnpj } });
      if (cnpjInUse) throw new AppError('Este CNPJ já está cadastrado.', 409);
    }

    const senhaHash = await bcrypt.hash(data.senha, 12);

    const enderecoStr = [data.cidade, data.estado].filter(Boolean).join(' - ') || undefined;

    const company = await prisma.company.create({
      data: {
        nome: data.nomeEmpresa,
        nomeFantasia: data.nomeFantasia || data.nomeEmpresa,
        cnpj: data.cnpj || null,
        telefone: data.telefoneEmpresa || null,
        endereco: enderecoStr || null,
      },
    });

    const user = await prisma.user.create({
      data: {
        nome: data.nomeAdmin,
        email: data.email,
        senha: senhaHash,
        role: 'ADMIN',
        companyId: company.id,
        ativo: true,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
    };
    const accessToken = this.issueAccessToken(payload);
    const refreshToken = await this.issueRefreshToken(user.id, meta);

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        companyId: user.companyId ?? null,
      },
      company: {
        id: company.id,
        nome: company.nome,
        nomeFantasia: company.nomeFantasia,
      },
    };
  }
}
