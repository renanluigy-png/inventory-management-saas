import { PlanoTier, Role, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

const DEMO_EMAIL = 'admin@demo.com';
const DEMO_PASSWORD = '123456';
const DEMO_CNPJ = '12.345.678/0001-99';

/**
 * Garante que a conta pública de demonstração exista no ambiente online.
 *
 * Importante: isto NÃO substitui o seed e nunca apaga dados.
 * É idempotente e corrige a conta caso o banco do Render seja recriado.
 */
export async function ensureDemoAccount(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const businessPlan = await prisma.plan.upsert({
    where: { tier: PlanoTier.BUSINESS },
    update: {
      nome: 'Business',
      descricao: 'Solução completa para empresas consolidadas.',
      precoMensal: 199.9,
      precoAnual: 1919.0,
      limiteUsuarios: 30,
      limiteProdutos: 10000,
      limiteClientes: 20000,
      limiteVendasMes: 50000,
      limiteStorageMb: 10240,
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'barcode', 'email', 'fiscal', 'storage', 'auditoria'],
      ativo: true,
    },
    create: {
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
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'barcode', 'email', 'fiscal', 'storage', 'auditoria'],
      ativo: true,
    },
  });

  const demoCompany = await prisma.company.upsert({
    where: { cnpj: DEMO_CNPJ },
    update: {
      nome: 'Empresa Demo',
      nomeFantasia: 'Demo Store',
      razaoSocial: 'Empresa Demo LTDA',
      email: 'contato@demo.com',
      telefone: '(11) 99999-0000',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
      plano: PlanoTier.BUSINESS,
      limiteUsuarios: 30,
      limiteProdutos: 10000,
      ativo: true,
    },
    create: {
      nome: 'Empresa Demo',
      nomeFantasia: 'Demo Store',
      razaoSocial: 'Empresa Demo LTDA',
      cnpj: DEMO_CNPJ,
      email: 'contato@demo.com',
      telefone: '(11) 99999-0000',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
      plano: PlanoTier.BUSINESS,
      limiteUsuarios: 30,
      limiteProdutos: 10000,
      ativo: true,
    },
  });

  await prisma.companySettings.upsert({
    where: { companyId: demoCompany.id },
    update: {},
    create: { companyId: demoCompany.id },
  });

  await prisma.companyTheme.upsert({
    where: { companyId: demoCompany.id },
    update: {},
    create: { companyId: demoCompany.id },
  });

  await prisma.subscription.upsert({
    where: { companyId: demoCompany.id },
    update: {
      planId: businessPlan.id,
      status: SubscriptionStatus.ATIVA,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      canceledAt: null,
      suspendedAt: null,
    },
    create: {
      companyId: demoCompany.id,
      planId: businessPlan.id,
      status: SubscriptionStatus.ATIVA,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      nome: 'Administrador Demo',
      senha: passwordHash,
      role: Role.ADMIN,
      companyId: demoCompany.id,
      ativo: true,
      loginAttempts: 0,
      bloqueadoAte: null,
    },
    create: {
      nome: 'Administrador Demo',
      email: DEMO_EMAIL,
      senha: passwordHash,
      role: Role.ADMIN,
      companyId: demoCompany.id,
      ativo: true,
    },
  });
}
