import { PlanoTier, Prisma } from '@prisma/client';
import { CompanyRepository } from '../repositories/CompanyRepository';
import { SubscriptionService } from './SubscriptionService';
import { AppError } from '../utils/AppError';
import { invalidateCompanyCache } from '../utils/cache';
import { CreateCompanyInput } from '../types/saas.types';
import { prisma } from '../config/database';

export class CompanyService {
  private companyRepo: CompanyRepository;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.companyRepo = new CompanyRepository();
    this.subscriptionService = new SubscriptionService();
  }

  async findAll(params?: { page?: number; limit?: number; search?: string; ativo?: boolean }) {
    return this.companyRepo.findAll(params);
  }

  async findById(id: string) {
    const company = await this.companyRepo.findById(id);
    if (!company) throw new AppError('Empresa não encontrada.', 404);
    return company;
  }

  async create(input: CreateCompanyInput) {
    if (input.cnpj) {
      const existing = await this.companyRepo.findByCnpj(input.cnpj);
      if (existing) throw new AppError('CNPJ já cadastrado.', 409);
    }
    if (input.email) {
      const existing = await this.companyRepo.findByEmail(input.email);
      if (existing) throw new AppError('E-mail já cadastrado.', 409);
    }

    const company = await this.companyRepo.create({
      nome: input.nome,
      nomeFantasia: input.nomeFantasia,
      razaoSocial: input.razaoSocial,
      cnpj: input.cnpj,
      email: input.email,
      telefone: input.telefone,
      endereco: input.endereco,
      cidade: input.cidade,
      estado: input.estado,
      cep: input.cep,
      settings: { create: {} },
      theme: { create: {} },
    });

    const planTier = (input.planTier?.toUpperCase() as PlanoTier) ?? PlanoTier.STARTER;
    await this.subscriptionService.createTrial(company.id, planTier);

    return this.companyRepo.findById(company.id);
  }

  async update(id: string, data: {
    nome?: string;
    nomeFantasia?: string;
    razaoSocial?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    logoUrl?: string;
  }) {
    await this.findById(id);

    if (data.cnpj) {
      const existing = await this.companyRepo.findByCnpj(data.cnpj);
      if (existing && existing.id !== id) throw new AppError('CNPJ já cadastrado.', 409);
    }
    if (data.email) {
      const existing = await this.companyRepo.findByEmail(data.email);
      if (existing && existing.id !== id) throw new AppError('E-mail já cadastrado.', 409);
    }

    const company = await this.companyRepo.update(id, data);
    invalidateCompanyCache(id);
    return company;
  }

  async suspend(id: string) {
    await this.findById(id);
    const [company] = await Promise.all([
      this.companyRepo.update(id, { ativo: false }),
      this.subscriptionService.suspend(id),
    ]);
    invalidateCompanyCache(id);
    return company;
  }

  async activate(id: string) {
    await this.findById(id);
    const [company] = await Promise.all([
      this.companyRepo.update(id, { ativo: true }),
      this.subscriptionService.activate(id),
    ]);
    invalidateCompanyCache(id);
    return company;
  }

  async changePlan(id: string, planTier: string) {
    await this.findById(id);
    return this.subscriptionService.changePlan(id, planTier);
  }

  async updateSettings(companyId: string, data: {
    moeda?: string;
    idioma?: string;
    fusoHorario?: string;
    tema?: string;
    impostoPercent?: number;
    estoqueMinimoPadrao?: number;
    permitirVendaSemEstoque?: boolean;
    configuracoesFiscais?: Record<string, unknown>;
    configuracoesEstoque?: Record<string, unknown>;
    configuracoesPDV?: Record<string, unknown>;
  }) {
    await this.findById(companyId);
    const toJson = (v: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined =>
      v as Prisma.InputJsonValue | undefined;

    const prismaData = {
      moeda: data.moeda,
      idioma: data.idioma,
      fusoHorario: data.fusoHorario,
      tema: data.tema,
      impostoPercent: data.impostoPercent,
      estoqueMinimoPadrao: data.estoqueMinimoPadrao,
      permitirVendaSemEstoque: data.permitirVendaSemEstoque,
      configuracoesFiscais: toJson(data.configuracoesFiscais),
      configuracoesEstoque: toJson(data.configuracoesEstoque),
      configuracoesPDV: toJson(data.configuracoesPDV),
    };

    return prisma.companySettings.upsert({
      where: { companyId },
      update: prismaData,
      create: { companyId, ...prismaData },
    });
  }

  async updateTheme(companyId: string, data: {
    corPrimaria?: string;
    corSecundaria?: string;
    corAcento?: string;
    logoUrl?: string;
    faviconUrl?: string;
  }) {
    await this.findById(companyId);
    const theme = await prisma.companyTheme.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
    invalidateCompanyCache(companyId);
    return theme;
  }

  async getUsage(companyId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usuarios, produtos, clientes, vendasMes, storage] = await Promise.all([
      prisma.user.count({ where: { companyId, ativo: true } }),
      prisma.product.count({ where: { companyId, ativo: true } }),
      prisma.customer.count({ where: { companyId, ativo: true } }),
      prisma.sale.count({ where: { companyId, status: 'FINALIZADA', createdAt: { gte: startOfMonth } } }),
      prisma.fileUpload.aggregate({ where: { companyId }, _sum: { tamanhoBytes: true } }),
    ]);

    const storageMb = Math.round((storage._sum.tamanhoBytes ?? 0) / (1024 * 1024));
    return { usuarios, produtos, clientes, vendasMes, storageMb };
  }
}
