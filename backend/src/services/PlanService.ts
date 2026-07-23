import { PlanoTier } from '@prisma/client';
import { PlanRepository } from '../repositories/PlanRepository';
import { AppError } from '../utils/AppError';
import { appCache, CacheKeys, TTL_SECONDS } from '../utils/cache';
import { prisma } from '../config/database';

interface PlanLimitsResult {
  limiteUsuarios: number;
  limiteProdutos: number;
  limiteClientes: number;
  limiteVendasMes: number;
  limiteStorageMb: number;
  modulos: string[];
  status: string;
  planNome: string;
  planTier: PlanoTier;
}

const DEFAULT_PLANS = [
  {
    tier: PlanoTier.STARTER,
    nome: 'Starter',
    descricao: 'Ideal para pequenos negócios iniciando sua jornada digital.',
    precoMensal: 49.9,
    precoAnual: 479.0,
    limiteUsuarios: 3,
    limiteProdutos: 100,
    limiteClientes: 200,
    limiteVendasMes: 500,
    limiteStorageMb: 512,
    modulos: ['pdv', 'estoque', 'clientes', 'relatorios'] as string[],
  },
  {
    tier: PlanoTier.PROFESSIONAL,
    nome: 'Professional',
    descricao: 'Para negócios em crescimento que precisam de mais recursos.',
    precoMensal: 99.9,
    precoAnual: 959.0,
    limiteUsuarios: 10,
    limiteProdutos: 1000,
    limiteClientes: 2000,
    limiteVendasMes: 5000,
    limiteStorageMb: 2048,
    modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'whatsapp', 'barcode', 'email'] as string[],
  },
  {
    tier: PlanoTier.BUSINESS,
    nome: 'Business',
    descricao: 'Solução completa para empresas consolidadas.',
    precoMensal: 199.9,
    precoAnual: 1919.0,
    limiteUsuarios: 30,
    limiteProdutos: 10000,
    limiteClientes: 20000,
    limiteVendasMes: 50000,
    limiteStorageMb: 10240,
    modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'whatsapp', 'barcode', 'email', 'fiscal', 'storage', 'auditoria'] as string[],
  },
  {
    tier: PlanoTier.ENTERPRISE,
    nome: 'Enterprise',
    descricao: 'Plataforma ilimitada para grandes operações.',
    precoMensal: 499.9,
    precoAnual: 4799.0,
    limiteUsuarios: 999,
    limiteProdutos: 999999,
    limiteClientes: 999999,
    limiteVendasMes: 999999,
    limiteStorageMb: 102400,
    modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'whatsapp', 'barcode', 'email', 'fiscal', 'storage', 'auditoria', 'multiempresa', 'api'] as string[],
  },
];

export class PlanService {
  private planRepository: PlanRepository;

  constructor() {
    this.planRepository = new PlanRepository();
  }

  async findAll() {
    return this.planRepository.findAll();
  }

  async findById(id: string) {
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new AppError('Plano não encontrado.', 404);
    return plan;
  }

  async findByTier(tier: string) {
    const tierEnum = tier.toUpperCase() as PlanoTier;
    if (!Object.values(PlanoTier).includes(tierEnum)) {
      throw new AppError('Tier de plano inválido.', 400);
    }
    const plan = await this.planRepository.findByTier(tierEnum);
    if (!plan) throw new AppError('Plano não encontrado.', 404);
    return plan;
  }

  async getLimitsForCompany(companyId: string): Promise<PlanLimitsResult> {
    const cached = appCache.get<PlanLimitsResult>(CacheKeys.PLAN_LIMITS(companyId));
    if (cached) return cached;

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new AppError('Empresa sem assinatura ativa.', 403);
    }

    const limits: PlanLimitsResult = {
      limiteUsuarios: subscription.plan.limiteUsuarios,
      limiteProdutos: subscription.plan.limiteProdutos,
      limiteClientes: subscription.plan.limiteClientes,
      limiteVendasMes: subscription.plan.limiteVendasMes,
      limiteStorageMb: subscription.plan.limiteStorageMb,
      modulos: subscription.plan.modulos,
      status: subscription.status,
      planNome: subscription.plan.nome,
      planTier: subscription.plan.tier,
    };

    appCache.set(CacheKeys.PLAN_LIMITS(companyId), limits, TTL_SECONDS.PLAN_LIMITS);
    return limits;
  }

  async seedDefaultPlans() {
    const results = [];
    for (const plan of DEFAULT_PLANS) {
      const result = await this.planRepository.upsertByTier(plan.tier, plan);
      results.push(result);
    }
    return results;
  }
}
