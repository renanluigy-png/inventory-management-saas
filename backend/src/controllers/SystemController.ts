import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { MetricsService } from '../services/MetricsService';
import { BackupService, BackupType } from '../services/BackupService';
import { AppError } from '../utils/AppError';

const backupQuerySchema = z.object({
  type: z.enum(['full', 'database', 'uploads', 'settings']).default('full'),
});

const restoreQuerySchema = z.object({
  confirm: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
});

export class SystemController {
  private backupService: BackupService;

  constructor() {
    this.backupService = new BackupService();
  }

  // ----------------------------------------------------------------
  // Health
  // ----------------------------------------------------------------

  /** GET /health — status da API, banco, memória e uptime. */
  health = async (_req: Request, res: Response): Promise<void> => {
    let dbStatus = 'connected';
    let dbLatency = 0;

    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'disconnected';
    }

    const mem = process.memoryUsage();
    const healthy = dbStatus === 'connected';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      versao: '1.0.0',
      node: process.version,
      database: {
        status: dbStatus,
        latencia: dbLatency > 0 ? `${dbLatency}ms` : 'N/A',
      },
      memoria: {
        heapUsado: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      },
    });
  };

  // ----------------------------------------------------------------
  // Métricas
  // ----------------------------------------------------------------

  /** GET /api/v1/system/metrics — métricas do servidor (ADMIN). */
  metrics = async (_req: Request, res: Response): Promise<void> => {
    const metrics = MetricsService.getInstance().getSnapshot();
    res.status(200).json({ status: 'success', data: metrics });
  };

  // ----------------------------------------------------------------
  // Backup
  // ----------------------------------------------------------------

  /** POST /api/v1/system/backup — cria backup e retorna o nome do arquivo. */
  createBackup = async (req: Request, res: Response): Promise<void> => {
    const { type } = backupQuerySchema.parse(req.query);
    const filename = await this.backupService.createBackup(type as BackupType);

    res.status(201).json({
      status: 'success',
      message: `Backup do tipo "${type}" criado com sucesso.`,
      data: { filename },
    });
  };

  /** GET /api/v1/system/backup — lista backups existentes. */
  listBackups = async (_req: Request, res: Response): Promise<void> => {
    const backups = this.backupService.listBackups();
    res.status(200).json({ status: 'success', data: { backups } });
  };

  /** GET /api/v1/system/backup/:filename — faz download de um backup. */
  downloadBackup = async (req: Request, res: Response): Promise<void> => {
    const { filename } = req.params as { filename: string };

    // Valida que o nome não contém traversal de diretório
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new AppError('Nome de arquivo inválido.', 400);
    }

    const stream = this.backupService.getBackupStream(filename);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  };

  // ----------------------------------------------------------------
  // Restore
  // ----------------------------------------------------------------

  /** GET /api/v1/system/check-setup — verifica se o banco está vazio (público). */
  checkSetup = async (_req: Request, res: Response): Promise<void> => {
    const userCount = await prisma.user.count();
    res.status(200).json({
      status: 'success',
      data: { configured: userCount > 0, userCount },
    });
  };

  /** POST /api/v1/system/demo-data — carrega dados de demonstração (ADMIN). */
  loadDemoData = async (_req: Request, res: Response): Promise<void> => {
    const existing = await prisma.product.count();
    if (existing > 0) {
      res.status(200).json({ status: 'success', message: 'Dados de demonstração já foram carregados.' });
      return;
    }

    // Categorias
    const cats = await prisma.$transaction([
      prisma.category.create({ data: { nome: 'Eletrônicos', descricao: 'Dispositivos eletrônicos em geral' } }),
      prisma.category.create({ data: { nome: 'Alimentos', descricao: 'Produtos alimentícios' } }),
      prisma.category.create({ data: { nome: 'Vestuário', descricao: 'Roupas e acessórios' } }),
      prisma.category.create({ data: { nome: 'Higiene', descricao: 'Produtos de higiene pessoal' } }),
      prisma.category.create({ data: { nome: 'Casa e Jardim', descricao: 'Produtos para casa e jardim' } }),
    ]);

    const [eletronicos, alimentos, vestuario, higiene, casa] = cats;

    // Produtos
    const produtos = await prisma.$transaction([
      prisma.product.create({ data: { nome: 'Smartphone Samsung Galaxy A54', sku: 'SMGA54', preco: 1899.90, precoCusto: 1100.00, estoque: 15, estoqueMinimo: 3, unidade: 'un', categoryId: eletronicos.id } }),
      prisma.product.create({ data: { nome: 'Fone de Ouvido Bluetooth', sku: 'FONBT01', preco: 149.90, precoCusto: 60.00, estoque: 30, estoqueMinimo: 5, unidade: 'un', categoryId: eletronicos.id } }),
      prisma.product.create({ data: { nome: 'Carregador USB-C 65W', sku: 'CARUSBC', preco: 89.90, precoCusto: 35.00, estoque: 50, estoqueMinimo: 10, unidade: 'un', categoryId: eletronicos.id } }),
      prisma.product.create({ data: { nome: 'Arroz Integral 5kg', sku: 'ARRINT5', preco: 28.90, precoCusto: 18.00, estoque: 100, estoqueMinimo: 20, unidade: 'kg', categoryId: alimentos.id } }),
      prisma.product.create({ data: { nome: 'Feijão Carioca 1kg', sku: 'FEJCAR1', preco: 8.90, precoCusto: 5.50, estoque: 150, estoqueMinimo: 30, unidade: 'kg', categoryId: alimentos.id } }),
      prisma.product.create({ data: { nome: 'Azeite de Oliva 500ml', sku: 'AZOLV05', preco: 32.90, precoCusto: 20.00, estoque: 60, estoqueMinimo: 10, unidade: 'un', categoryId: alimentos.id } }),
      prisma.product.create({ data: { nome: 'Camiseta Básica Masculina', sku: 'CAMBASM', preco: 49.90, precoCusto: 22.00, estoque: 80, estoqueMinimo: 15, unidade: 'un', categoryId: vestuario.id } }),
      prisma.product.create({ data: { nome: 'Calça Jeans Skinny', sku: 'CAJESKI', preco: 139.90, precoCusto: 65.00, estoque: 40, estoqueMinimo: 8, unidade: 'un', categoryId: vestuario.id } }),
      prisma.product.create({ data: { nome: 'Shampoo Hidratante 400ml', sku: 'SHPHID4', preco: 19.90, precoCusto: 9.00, estoque: 120, estoqueMinimo: 20, unidade: 'un', categoryId: higiene.id } }),
      prisma.product.create({ data: { nome: 'Sabonete Líquido 250ml', sku: 'SABLIQ2', preco: 12.90, precoCusto: 5.00, estoque: 200, estoqueMinimo: 30, unidade: 'un', categoryId: higiene.id } }),
      prisma.product.create({ data: { nome: 'Vassoura de Cerdas', sku: 'VASCER1', preco: 24.90, precoCusto: 12.00, estoque: 35, estoqueMinimo: 5, unidade: 'un', categoryId: casa.id } }),
      prisma.product.create({ data: { nome: 'Detergente Neutro 500ml', sku: 'DETNET5', preco: 4.90, precoCusto: 2.00, estoque: 300, estoqueMinimo: 50, unidade: 'un', categoryId: casa.id } }),
    ]);

    // Clientes
    const clientes = await prisma.$transaction([
      prisma.customer.create({ data: { nome: 'Ana Paula Souza', email: 'ana.paula@email.com', cpf: '111.222.333-44', telefone: '(11) 98765-4321', endereco: 'São Paulo - SP' } }),
      prisma.customer.create({ data: { nome: 'Carlos Roberto Lima', email: 'carlos.lima@email.com', cpf: '222.333.444-55', telefone: '(21) 97654-3210', endereco: 'Rio de Janeiro - RJ' } }),
      prisma.customer.create({ data: { nome: 'Fernanda Oliveira', email: 'fernanda.oli@email.com', cpf: '333.444.555-66', telefone: '(31) 96543-2109', endereco: 'Belo Horizonte - MG' } }),
      prisma.customer.create({ data: { nome: 'João Batista Santos', email: 'joao.santos@email.com', cpf: '444.555.666-77', telefone: '(41) 95432-1098', endereco: 'Curitiba - PR' } }),
      prisma.customer.create({ data: { nome: 'Maria Cristina Alves', email: 'maria.alves@email.com', cpf: '555.666.777-88', telefone: '(51) 94321-0987', endereco: 'Porto Alegre - RS' } }),
    ]);

    // Usuário admin para associar às vendas
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
    if (!adminUser) {
      res.status(422).json({ status: 'error', message: 'Nenhum usuário admin encontrado para associar às vendas.' });
      return;
    }

    // Vendas distribuídas nos últimos 30 dias
    const formasPagamento = ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX'] as const;
    const vendaCriadas: string[] = [];

    for (let d = 30; d >= 0; d--) {
      const data = new Date();
      data.setDate(data.getDate() - d);
      data.setHours(10, 0, 0, 0);

      const numVendas = d === 0 ? 3 : Math.floor(Math.random() * 5) + 1;

      for (let v = 0; v < numVendas; v++) {
        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        const forma = formasPagamento[Math.floor(Math.random() * formasPagamento.length)];
        const produto1 = produtos[Math.floor(Math.random() * produtos.length)];
        const produto2 = produtos[Math.floor(Math.random() * produtos.length)];
        const qty1 = Math.floor(Math.random() * 3) + 1;
        const qty2 = Math.floor(Math.random() * 2) + 1;
        const subtotal1 = produto1.preco.toNumber() * qty1;
        const subtotal2 = produto2.preco.toNumber() * qty2;
        const total = subtotal1 + subtotal2;

        const hora = new Date(data);
        hora.setHours(8 + v * 2, Math.floor(Math.random() * 60), 0, 0);

        const venda = await prisma.sale.create({
          data: {
            customerId: cliente.id,
            userId: adminUser.id,
            status: 'FINALIZADA',
            formaPagamento: forma,
            total,
            desconto: 0,
            createdAt: hora,
            updatedAt: hora,
            itens: {
              create: [
                { productId: produto1.id, quantidade: qty1, precoUnit: produto1.preco.toNumber(), desconto: 0, subtotal: subtotal1 },
                { productId: produto2.id, quantidade: qty2, precoUnit: produto2.preco.toNumber(), desconto: 0, subtotal: subtotal2 },
              ],
            },
          },
        });

        vendaCriadas.push(venda.id);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Dados de demonstração carregados com sucesso.',
      data: {
        categorias: cats.length,
        produtos: produtos.length,
        clientes: clientes.length,
        vendas: vendaCriadas.length,
      },
    });
  };

  /** POST /api/v1/system/restore — restaura dados a partir de um ZIP enviado. */
  restore = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) throw new AppError('Arquivo de backup (.zip) é obrigatório.', 400);

    const { confirm } = restoreQuerySchema.parse(req.query);
    const zipBuffer = req.file.buffer;

    // Sempre inspeciona primeiro para retornar metadados
    const inspecao = await this.backupService.inspectBackup(zipBuffer);

    if (!confirm) {
      res.status(200).json({
        status: 'success',
        message: 'Inspeção concluída. Para restaurar, reenvie com ?confirm=true.',
        data: { inspecao },
      });
      return;
    }

    const resultado = await this.backupService.restoreDatabase(zipBuffer);

    res.status(200).json({
      status: 'success',
      message: 'Restore concluído com sucesso.',
      data: { inspecao, resultado },
    });
  };
}
