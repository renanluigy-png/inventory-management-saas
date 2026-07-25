import { PrismaClient, Role, PlanoTier, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('\n Iniciando seed do banco de dados...\n');

  // ----------------------------------------------------------------
  // Limpeza completa: remover todos os dados de negócio e usuários
  // antigos, garantindo banco zerado antes do seed.
  // Ordem respeita restrições FK do banco.
  // ----------------------------------------------------------------
  await prisma.caixaMovimentacao.deleteMany();   // FK → caixa + sale
  await prisma.pixPayment.deleteMany();           // FK → sale
  await prisma.documentoFiscal.deleteMany();      // FK → sale
  await prisma.sale.deleteMany();                 // cascade → sale_items
  await prisma.caixa.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();  // FK → product + user
  await prisma.product.deleteMany();              // cascade → promocao_products
  await prisma.promocao.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  const keepEmails = [env.MASTER_EMAIL, 'admin@demo.com'];
  const oldCount = await prisma.user.count({ where: { email: { notIn: keepEmails } } });
  if (oldCount > 0) {
    await prisma.user.deleteMany({ where: { email: { notIn: keepEmails } } });
  }
  console.log(' Limpeza: banco zerado (categorias, produtos, clientes, vendas, usuários antigos).');

  // ----------------------------------------------------------------
  // Planos SaaS
  // ----------------------------------------------------------------
  const planosData = [
    {
      tier: PlanoTier.FREE,
      nome: 'Free',
      descricao: 'Plano gratuito para experimentar o sistema.',
      precoMensal: 0,
      precoAnual: 0,
      limiteUsuarios: 1,
      limiteProdutos: 30,
      limiteClientes: 50,
      limiteVendasMes: 100,
      limiteStorageMb: 128,
      modulos: ['pdv', 'estoque'],
    },
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
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios'],
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
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'barcode', 'email'],
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
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'barcode', 'email', 'fiscal', 'storage', 'auditoria'],
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
      modulos: ['pdv', 'estoque', 'clientes', 'relatorios', 'pix', 'barcode', 'email', 'fiscal', 'storage', 'auditoria', 'multiempresa', 'api'],
    },
  ];

  for (const plano of planosData) {
    await prisma.plan.upsert({ where: { tier: plano.tier }, update: plano, create: plano });
  }
  console.log(' Planos: 5 criados/atualizados');

  // ----------------------------------------------------------------
  // MASTER da plataforma
  // ----------------------------------------------------------------
  const masterHash = await bcrypt.hash(env.MASTER_SENHA, 10);
  const master = await prisma.user.upsert({
    where: { email: env.MASTER_EMAIL },
    update: { senha: masterHash },
    create: {
      nome: 'Super Administrador',
      email: env.MASTER_EMAIL,
      senha: masterHash,
      role: Role.MASTER,
      companyId: null,
    },
  });
  console.log(` MASTER: ${master.email}`);

  // Remove e-mails master legados caso existam
  const legadoEmails = ['master@plataforma.com', 'master@controleestoque.com'].filter(e => e !== env.MASTER_EMAIL);
  if (legadoEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: legadoEmails } } });
  }

  // ----------------------------------------------------------------
  // Empresa de demonstração
  // ----------------------------------------------------------------
  const businessPlan = await prisma.plan.findUnique({ where: { tier: PlanoTier.BUSINESS } });

  const demoCompany = await prisma.company.upsert({
    where: { cnpj: '12.345.678/0001-99' },
    update: { email: 'contato@demo.com', plano: PlanoTier.BUSINESS, limiteUsuarios: 30, limiteProdutos: 10000 },
    create: {
      nome: 'Empresa Demo',
      nomeFantasia: 'Demo Store',
      razaoSocial: 'Empresa Demo LTDA',
      cnpj: '12.345.678/0001-99',
      email: 'contato@demo.com',
      telefone: '(11) 99999-0000',
      endereco: 'Rua das Flores, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
      plano: PlanoTier.BUSINESS,
      limiteUsuarios: 30,
      limiteProdutos: 10000,
      settings: { create: {} },
      theme: { create: {} },
    },
  });

  if (businessPlan) {
    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.subscription.upsert({
      where: { companyId: demoCompany.id },
      update: {},
      create: {
        companyId: demoCompany.id,
        planId: businessPlan.id,
        status: SubscriptionStatus.ATIVA,
        currentPeriodEnd: periodEnd,
      },
    });
  }
  console.log(` Empresa demo: ${demoCompany.nome} (${demoCompany.email})`);

  // ----------------------------------------------------------------
  // Admin da empresa demo
  // ----------------------------------------------------------------
  const adminHash = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { companyId: demoCompany.id, senha: adminHash },
    create: {
      nome: 'Administrador Demo',
      email: 'admin@demo.com',
      senha: adminHash,
      role: Role.ADMIN,
      companyId: demoCompany.id,
    },
  });
  console.log(` Admin: ${admin.email}`);

  // SystemSettings singleton (legado)
  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      nomeEmpresa: 'Empresa Demo',
      moeda: 'BRL',
      tema: 'light',
    },
  });

  console.log('\n Seed concluído!\n');
  console.log(' Credenciais:');
  console.log(`   ${env.MASTER_EMAIL}  [MASTER]  (senha: MASTER_SENHA do .env)`);
  console.log('   admin@demo.com              / 123456       [ADMIN]  — Demo Store\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
