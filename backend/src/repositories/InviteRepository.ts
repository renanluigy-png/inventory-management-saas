import { Role } from '@prisma/client';
import { prisma } from '../config/database';

export class InviteRepository {
  async findByToken(tokenHash: string) {
    return prisma.companyInvite.findUnique({
      where: { tokenHash },
      include: { company: true },
    });
  }

  async findByCompanyAndEmail(companyId: string, email: string) {
    return prisma.companyInvite.findUnique({
      where: { companyId_email: { companyId, email } },
    });
  }

  async findAllByCompany(companyId: string) {
    return prisma.companyInvite.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    companyId: string;
    email: string;
    role: Role;
    tokenHash: string;
    expiresAt: Date;
    convidadoPor?: string;
  }) {
    return prisma.companyInvite.create({ data });
  }

  async markAccepted(id: string) {
    return prisma.companyInvite.update({
      where: { id },
      data: { aceito: true, aceitoAt: new Date() },
    });
  }

  async delete(id: string) {
    return prisma.companyInvite.delete({ where: { id } });
  }

  async deleteByCompanyAndEmail(companyId: string, email: string) {
    return prisma.companyInvite.deleteMany({
      where: { companyId, email },
    });
  }

  async deleteExpired() {
    return prisma.companyInvite.deleteMany({
      where: { expiresAt: { lt: new Date() }, aceito: false },
    });
  }
}
