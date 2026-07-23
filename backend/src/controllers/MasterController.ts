import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { MasterService } from '../services/MasterService';
import { CompanyService } from '../services/CompanyService';
import { PlanService } from '../services/PlanService';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

const createCompanySchema = z.object({
  nome: z.string().min(2),
  nomeFantasia: z.string().optional(),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  planTier: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']).optional(),
  adminNome: z.string().min(2),
  adminEmail: z.string().email(),
  adminSenha: z.string().min(6),
});

const updateCompanySchema = z.object({
  nome: z.string().min(2).optional(),
  nomeFantasia: z.string().optional(),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});

export class MasterController {
  private masterService: MasterService;
  private companyService: CompanyService;
  private planService: PlanService;

  constructor() {
    this.masterService = new MasterService();
    this.companyService = new CompanyService();
    this.planService = new PlanService();
  }

  // ── Platform stats ──────────────────────────────────────────────

  getStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.masterService.getPlatformStats();
    res.status(200).json({ status: 'success', data: { stats } });
  };

  // ── Companies ───────────────────────────────────────────────────

  listCompanies = async (req: Request, res: Response): Promise<void> => {
    const page   = Number(req.query['page'])  || 1;
    const limit  = Number(req.query['limit']) || 20;
    const search = req.query['search'] as string | undefined;
    const ativo  = req.query['ativo'] !== undefined ? req.query['ativo'] === 'true' : undefined;

    const result = await this.masterService.listCompanies({ page, limit, search, ativo });
    res.status(200).json({ status: 'success', ...result });
  };

  createCompany = async (req: Request, res: Response): Promise<void> => {
    const data = createCompanySchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({ where: { email: data.adminEmail } });
    if (existingEmail) throw new AppError('E-mail do administrador já está em uso.', 409);
    if (data.cnpj) {
      const existingCnpj = await prisma.company.findUnique({ where: { cnpj: data.cnpj } });
      if (existingCnpj) throw new AppError('CNPJ já cadastrado.', 409);
    }

    const company = await this.companyService.create({
      nome: data.nome, nomeFantasia: data.nomeFantasia, razaoSocial: data.razaoSocial,
      cnpj: data.cnpj, email: data.email, telefone: data.telefone,
      endereco: data.endereco, cidade: data.cidade, estado: data.estado, cep: data.cep,
      planTier: data.planTier,
    });
    if (!company) throw new AppError('Erro ao criar empresa.', 500);

    const senhaHash = await bcrypt.hash(data.adminSenha, 10);
    const adminUser = await prisma.user.create({
      data: { nome: data.adminNome, email: data.adminEmail, senha: senhaHash, role: 'ADMIN', companyId: company.id },
      select: { id: true, nome: true, email: true, role: true },
    });

    res.status(201).json({ status: 'success', data: { company, adminUser } });
  };

  getCompany = async (req: Request, res: Response): Promise<void> => {
    const detail = await this.masterService.getCompanyDetail(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company: detail } });
  };

  updateCompany = async (req: Request, res: Response): Promise<void> => {
    const id   = req.params['id'] as string;
    const data = updateCompanySchema.parse(req.body);
    const company = await prisma.company.update({ where: { id }, data });
    res.status(200).json({ status: 'success', data: { company } });
  };

  deleteCompany = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const exists = await prisma.company.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new AppError('Empresa não encontrada.', 404);
    await prisma.company.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Empresa removida com sucesso.' });
  };

  suspendCompany = async (req: Request, res: Response): Promise<void> => {
    const company = await this.companyService.suspend(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company } });
  };

  activateCompany = async (req: Request, res: Response): Promise<void> => {
    const company = await this.companyService.activate(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company } });
  };

  changeCompanyPlan = async (req: Request, res: Response): Promise<void> => {
    const { tier } = z.object({ tier: z.string() }).parse(req.body);
    const subscription = await this.companyService.changePlan(req.params['id'] as string, tier);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  impersonateCompany = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.params['id'] as string;
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, nome: true } });
    if (!company) throw new AppError('Empresa não encontrada.', 404);

    const adminUser = await prisma.user.findFirst({
      where: { companyId, role: 'ADMIN', ativo: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!adminUser) throw new AppError('Nenhum administrador ativo nesta empresa.', 404);

    const payload = {
      sub: adminUser.id, email: adminUser.email, role: adminUser.role,
      companyId: adminUser.companyId,
      impersonatedBy: (req as any).user?.sub,
    };
    const impersonateToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: 7200 });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: impersonateToken, expiresIn: 7200,
        user: { id: adminUser.id, nome: adminUser.nome, email: adminUser.email, role: adminUser.role, companyId: adminUser.companyId },
        company: { id: company.id, nome: company.nome },
      },
    });
  };

  resetAdminPassword = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.params['id'] as string;
    const { novaSenha } = z.object({ novaSenha: z.string().min(6) }).parse(req.body);

    const adminUser = await prisma.user.findFirst({
      where: { companyId, role: 'ADMIN', ativo: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!adminUser) throw new AppError('Nenhum administrador ativo encontrado.', 404);

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: adminUser.id }, data: { senha: senhaHash } });
    await prisma.refreshToken.updateMany({ where: { userId: adminUser.id }, data: { revogado: true } });

    res.status(200).json({ status: 'success', message: `Senha do administrador ${adminUser.email} redefinida.` });
  };

  // ── Users ────────────────────────────────────────────────────────

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const page      = Number(req.query['page'])  || 1;
    const limit     = Number(req.query['limit']) || 20;
    const search    = req.query['search']    as string | undefined;
    const role      = req.query['role']      as Role  | undefined;
    const companyId = req.query['companyId'] as string | undefined;
    const ativo     = req.query['ativo'] !== undefined ? req.query['ativo'] === 'true' : undefined;

    const where: Prisma.UserWhereInput = {
      role: { not: 'MASTER' as Role },
      ...(search    && { OR: [{ nome: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
      ...(role      && { role }),
      ...(companyId && { companyId }),
      ...(ativo !== undefined && { ativo }),
    };

    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true, nome: true, email: true, role: true, ativo: true,
          ultimoLogin: true, createdAt: true,
          company: { select: { id: true, nome: true, nomeFantasia: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  };

  blockUser = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, ativo: true } });
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    if (user.role === 'MASTER') throw new AppError('Não é possível bloquear o usuário MASTER.', 403);

    const updated = await prisma.user.update({
      where: { id },
      data: { ativo: !user.ativo },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });

    if (!updated.ativo) {
      await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revogado: true } });
    }

    res.status(200).json({ status: 'success', data: { user: updated } });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    if (user.role === 'MASTER') throw new AppError('Não é possível excluir o usuário MASTER.', 403);
    try {
      await prisma.user.delete({ where: { id } });
    } catch (err: any) {
      if (err?.code === 'P2003' || err?.code === 'P2014') {
        throw new AppError(
          'Este usuário possui registros vinculados (vendas, caixa, estoque) e não pode ser removido permanentemente. Use "Bloquear" para desativá-lo sem perder os dados.',
          409
        );
      }
      throw err;
    }
    res.status(200).json({ status: 'success', message: 'Usuário removido.' });
  };

  resetUserPassword = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const { novaSenha } = z.object({ novaSenha: z.string().min(6) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new AppError('Usuário não encontrado.', 404);
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id }, data: { senha: senhaHash } });
    await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revogado: true } });
    res.status(200).json({ status: 'success', message: `Senha de ${user.email} redefinida.` });
  };

  // ── Monitor ──────────────────────────────────────────────────────

  getMonitor = async (_req: Request, res: Response): Promise<void> => {
    let dbStatus = 'online';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'offline';
    }
    const mem = process.memoryUsage();
    res.status(200).json({
      status: 'success',
      data: {
        api:      { status: 'online', versao: '1.0.0', node: process.version },
        database: { status: dbStatus, latencia: dbLatency },
        memoria:  {
          heapUsadoMb: Math.round(mem.heapUsed  / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
          rssMb:       Math.round(mem.rss        / 1024 / 1024),
          percentual:  Math.round((mem.heapUsed / mem.heapTotal) * 100),
        },
        uptime: Math.round(process.uptime()),
      },
    });
  };

  // ── Audit ────────────────────────────────────────────────────────

  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const limit     = Math.min(Number(req.query['limit']) || 50, 200);
    const companyId = req.query['companyId'] as string | undefined;
    const acao      = req.query['acao']      as string | undefined;
    const page      = Number(req.query['page']) || 1;
    const skip      = (page - 1) * limit;

    const where = {
      ...(companyId && { companyId }),
      ...(acao      && { acao: acao as any }),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { dataHora: 'desc' },
        skip, take: limit,
        include: { usuario: { select: { nome: true, email: true } } },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: { logs },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  };

  // ── Plans ────────────────────────────────────────────────────────

  seedPlans = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.planService.seedDefaultPlans();
    res.status(200).json({ status: 'success', message: 'Planos configurados.', data: { plans } });
  };
}
