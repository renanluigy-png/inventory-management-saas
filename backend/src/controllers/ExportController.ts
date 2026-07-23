import { Request, Response } from 'express';
import { z } from 'zod';
import { ExportService, ExportColumn } from '../services/ExportService';
import { prisma } from '../config/database';

const querySchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf']).default('csv'),
  entidade: z.string(),
});

const ENTITY_CONFIGS: Record<string, { columns: ExportColumn[]; title: string }> = {
  products: {
    title: 'Produtos',
    columns: [
      { key: 'nome', header: 'Nome' },
      { key: 'sku', header: 'SKU' },
      { key: 'preco', header: 'Preço', format: 'currency' },
      { key: 'precoCusto', header: 'Custo', format: 'currency' },
      { key: 'estoque', header: 'Estoque', format: 'number' },
      { key: 'categoria', header: 'Categoria' },
      { key: 'ativo', header: 'Ativo' },
    ],
  },
  customers: {
    title: 'Clientes',
    columns: [
      { key: 'nome', header: 'Nome' },
      { key: 'cpf', header: 'CPF' },
      { key: 'email', header: 'E-mail' },
      { key: 'telefone', header: 'Telefone' },
      { key: 'createdAt', header: 'Cadastrado em', format: 'date' },
    ],
  },
  sales: {
    title: 'Vendas',
    columns: [
      { key: 'numero', header: '#' },
      { key: 'cliente', header: 'Cliente' },
      { key: 'total', header: 'Total', format: 'currency' },
      { key: 'desconto', header: 'Desconto', format: 'currency' },
      { key: 'formaPagamento', header: 'Pagamento' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Data', format: 'date' },
    ],
  },
  stock: {
    title: 'Movimentações de Estoque',
    columns: [
      { key: 'produto', header: 'Produto' },
      { key: 'tipo', header: 'Tipo' },
      { key: 'quantidade', header: 'Quantidade', format: 'number' },
      { key: 'quantAnterior', header: 'Antes', format: 'number' },
      { key: 'quantNova', header: 'Depois', format: 'number' },
      { key: 'motivo', header: 'Motivo' },
      { key: 'createdAt', header: 'Data', format: 'date' },
    ],
  },
};

export class ExportController {
  private exportSvc: ExportService;
  constructor() { this.exportSvc = new ExportService(); }

  export = async (req: Request, res: Response): Promise<void> => {
    const { format, entidade } = querySchema.parse(req.query);
    const companyId = req.companyId;
    const config = ENTITY_CONFIGS[entidade];
    if (!config) {
      res.status(400).json({ status: 'error', message: 'Entidade não suportada para exportação.' });
      return;
    }

    const data = await this.fetchData(entidade, companyId);
    const filename = `${entidade}_${new Date().toISOString().slice(0, 10)}`;

    switch (format) {
      case 'csv':
        await this.exportSvc.exportToCSV(res, filename, config.columns, data);
        break;
      case 'excel':
        await this.exportSvc.exportToExcel(res, filename, config.columns, data, config.title);
        break;
      case 'pdf':
        await this.exportSvc.exportToPDF(res, filename, config.columns, data, config.title);
        break;
    }
  };

  private async fetchData(entidade: string, companyId?: string): Promise<Record<string, unknown>[]> {
    const where = companyId ? { companyId } : {};

    switch (entidade) {
      case 'products': {
        const rows = await prisma.product.findMany({
          where, include: { category: true }, orderBy: { nome: 'asc' }, take: 5000,
        });
        return rows.map((r) => ({ ...r, categoria: r.category?.nome ?? '', preco: Number(r.preco), precoCusto: Number(r.precoCusto ?? 0), ativo: r.ativo ? 'Sim' : 'Não' }));
      }
      case 'customers': {
        const rows = await prisma.customer.findMany({ where, orderBy: { nome: 'asc' }, take: 5000 });
        return rows.map((r) => ({ ...r }));
      }
      case 'sales': {
        const rows = await prisma.sale.findMany({
          where, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 5000,
        });
        return rows.map((r) => ({ ...r, cliente: r.customer?.nome ?? 'Sem cliente', total: Number(r.total), desconto: Number(r.desconto) }));
      }
      case 'stock': {
        const rows = await prisma.movimentacaoEstoque.findMany({
          where, include: { product: true }, orderBy: { createdAt: 'desc' }, take: 5000,
        });
        return rows.map((r) => ({ ...r, produto: r.product.nome }));
      }
      default:
        return [];
    }
  }
}
