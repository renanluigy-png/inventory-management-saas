import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { InviteRepository } from '../repositories/InviteRepository';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { sendInviteEmail } from '../utils/email';
import { prisma } from '../config/database';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class InviteService {
  private inviteRepo: InviteRepository;
  private companyRepo: CompanyRepository;

  constructor() {
    this.inviteRepo = new InviteRepository();
    this.companyRepo = new CompanyRepository();
  }

  async invite(companyId: string, email: string, role: string, convidadoPor: string) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new AppError('Empresa não encontrada.', 404);

    const existingUser = await prisma.user.findFirst({
      where: { email, companyId },
    });
    if (existingUser) throw new AppError('Usuário já pertence a esta empresa.', 409);

    const roleEnum = role.toUpperCase() as Role;
    const validRoles: Role[] = [Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO, Role.CAIXA];
    if (!validRoles.includes(roleEnum)) {
      throw new AppError('Role inválida para convite.', 400);
    }

    // Remove convite anterior para o mesmo e-mail, se existir
    await this.inviteRepo.deleteByCompanyAndEmail(companyId, email);

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(
      Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
    );

    const invite = await this.inviteRepo.create({
      companyId,
      email,
      role: roleEnum,
      tokenHash,
      expiresAt,
      convidadoPor,
    });

    const inviteLink = `${env.FRONTEND_URL}/invite?token=${raw}`;
    await sendInviteEmail(email, {
      nomeEmpresa: company.nome,
      role: roleEnum,
      inviteLink,
      expiresHours: env.INVITE_TOKEN_EXPIRES_HOURS,
    });

    return { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
  }

  async listByCompany(companyId: string) {
    return this.inviteRepo.findAllByCompany(companyId);
  }

  async revoke(inviteId: string, companyId: string) {
    const invite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new AppError('Convite não encontrado.', 404);
    if (invite.companyId !== companyId) throw new AppError('Acesso negado.', 403);
    await this.inviteRepo.delete(inviteId);
  }

  async validateToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const invite = await this.inviteRepo.findByToken(tokenHash);

    if (!invite) throw new AppError('Convite inválido ou expirado.', 400);
    if (invite.aceito) throw new AppError('Convite já foi utilizado.', 400);
    if (invite.expiresAt < new Date()) throw new AppError('Convite expirado.', 400);

    return invite;
  }

  async accept(rawToken: string, data: { nome: string; senha: string }) {
    const invite = await this.validateToken(rawToken);

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      // Usuário já existe: só vincula à empresa e aceita convite
      await Promise.all([
        prisma.user.update({
          where: { id: existingUser.id },
          data: { companyId: invite.companyId, role: invite.role },
        }),
        this.inviteRepo.markAccepted(invite.id),
      ]);
      return { message: 'Convite aceito. Você foi vinculado à empresa.', userId: existingUser.id };
    }

    const senhaHash = await bcrypt.hash(data.senha, 12);
    const [user] = await Promise.all([
      prisma.user.create({
        data: {
          nome: data.nome,
          email: invite.email,
          senha: senhaHash,
          role: invite.role,
          companyId: invite.companyId,
        },
        select: { id: true, nome: true, email: true, role: true },
      }),
      this.inviteRepo.markAccepted(invite.id),
    ]);

    return { message: 'Conta criada com sucesso.', userId: user.id };
  }
}
