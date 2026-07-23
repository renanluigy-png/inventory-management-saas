import { Request, Response } from 'express';
import { z } from 'zod';
import { CompanyService } from '../services/CompanyService';
import { prisma } from '../config/database';

const createSchema = z.object({
  nome: z.string().min(2),
  nomeFantasia: z.string().optional(),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  planTier: z.enum(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']).optional(),
  trialDays: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  nomeFantasia: z.string().optional(),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const settingsSchema = z.object({
  moeda: z.string().length(3).optional(),
  idioma: z.string().optional(),
  fusoHorario: z.string().optional(),
  tema: z.string().optional(),
  impostoPercent: z.number().min(0).max(100).optional(),
  estoqueMinimoPadrao: z.number().int().min(0).optional(),
  permitirVendaSemEstoque: z.boolean().optional(),
  configuracoesFiscais: z.record(z.unknown()).optional(),
  configuracoesEstoque: z.record(z.unknown()).optional(),
  configuracoesPDV: z.record(z.unknown()).optional(),
});

const themeSchema = z.object({
  corPrimaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  corSecundaria: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  corAcento: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
});

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  // GET /companies/me — empresa do usuário autenticado
  getMyCompany = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const company = await this.companyService.findById(companyId);
    res.status(200).json({ status: 'success', data: { company } });
  };

  // GET /companies/:id
  findById = async (req: Request, res: Response): Promise<void> => {
    const company = await this.companyService.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company } });
  };

  // PUT /companies/:id
  update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string;
    const data = updateSchema.parse(req.body);
    const company = await this.companyService.update(id, data);
    res.status(200).json({ status: 'success', data: { company } });
  };

  // GET /companies/me/usage
  getUsage = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const usage = await this.companyService.getUsage(companyId);
    res.status(200).json({ status: 'success', data: { usage } });
  };

  // GET /companies/me/settings
  getSettings = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    res.status(200).json({ status: 'success', data: { settings } });
  };

  // PUT /companies/me/settings
  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const data = settingsSchema.parse(req.body);
    const settings = await this.companyService.updateSettings(companyId, data);
    res.status(200).json({ status: 'success', data: { settings } });
  };

  // GET /companies/me/theme
  getTheme = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const theme = await prisma.companyTheme.findUnique({ where: { companyId } });
    res.status(200).json({ status: 'success', data: { theme } });
  };

  // PUT /companies/me/theme
  updateTheme = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const data = themeSchema.parse(req.body);
    const theme = await this.companyService.updateTheme(companyId, data);
    res.status(200).json({ status: 'success', data: { theme } });
  };

  // POST /companies (MASTER)
  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const company = await this.companyService.create(data);
    res.status(201).json({ status: 'success', data: { company } });
  };

  // PATCH /companies/:id/suspend (MASTER)
  suspend = async (req: Request, res: Response): Promise<void> => {
    const company = await this.companyService.suspend(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company } });
  };

  // PATCH /companies/:id/activate (MASTER)
  activate = async (req: Request, res: Response): Promise<void> => {
    const company = await this.companyService.activate(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { company } });
  };

  // PATCH /companies/:id/plan (MASTER)
  changePlan = async (req: Request, res: Response): Promise<void> => {
    const { tier } = z.object({ tier: z.string() }).parse(req.body);
    const subscription = await this.companyService.changePlan(
      req.params['id'] as string,
      tier
    );
    res.status(200).json({ status: 'success', data: { subscription } });
  };
}
