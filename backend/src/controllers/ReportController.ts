import { Request, Response } from 'express';
import { z } from 'zod';
import { ReportService } from '../services/ReportService';
import { FormaPagamento } from '@prisma/client';

// ----------------------------------------------------------------
// Schemas de validação
// ----------------------------------------------------------------

const FORMAS_PAGAMENTO = [
  'DINHEIRO',
  'PIX',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'FIADO',
] as const;

// GET /reports/financial
const financialQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
  userId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  orderBy: z.enum(['numero', 'total', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// GET /reports/inventory
const inventoryQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  orderBy: z.enum(['nome', 'estoque', 'preco', 'createdAt']).default('nome'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  // ----------------------------------------------------------------
  // Relatórios JSON
  // ----------------------------------------------------------------

  /**
   * GET /api/v1/reports/financial
   * Relatório financeiro completo com resumo e lista paginada de vendas.
   */
  getFinancialReport = async (req: Request, res: Response): Promise<void> => {
    const params = financialQuerySchema.parse(req.query);
    const result = await this.reportService.getFinancialReport({
      ...params,
      formaPagamento: params.formaPagamento as FormaPagamento | undefined,
    });
    res.status(200).json({ status: 'success', ...result });
  };

  /**
   * GET /api/v1/reports/inventory
   * Relatório de estoque com valores e status por produto.
   */
  getInventoryReport = async (req: Request, res: Response): Promise<void> => {
    const params = inventoryQuerySchema.parse(req.query);
    const result = await this.reportService.getInventoryReport({
      ...params,
      orderBy: params.orderBy as 'nome' | 'estoque' | 'preco' | 'createdAt',
    });
    res.status(200).json({ status: 'success', ...result });
  };

  // ----------------------------------------------------------------
  // Exportação PDF
  // ----------------------------------------------------------------

  /**
   * GET /api/v1/reports/financial/pdf
   * Gera relatório financeiro em PDF e inicia o download.
   */
  exportFinancialPDF = async (req: Request, res: Response): Promise<void> => {
    const params = financialQuerySchema.parse(req.query);
    await this.reportService.exportFinancialPDF(
      { ...params, formaPagamento: params.formaPagamento as FormaPagamento | undefined },
      res
    );
  };

  /**
   * GET /api/v1/reports/inventory/pdf
   * Gera relatório de estoque em PDF e inicia o download.
   */
  exportInventoryPDF = async (req: Request, res: Response): Promise<void> => {
    const params = inventoryQuerySchema.parse(req.query);
    await this.reportService.exportInventoryPDF(
      { ...params, orderBy: params.orderBy as 'nome' | 'estoque' | 'preco' | 'createdAt' },
      res
    );
  };

  // ----------------------------------------------------------------
  // Exportação Excel
  // ----------------------------------------------------------------

  /**
   * GET /api/v1/reports/financial/excel
   * Gera relatório financeiro em XLSX e inicia o download.
   */
  exportFinancialExcel = async (req: Request, res: Response): Promise<void> => {
    const params = financialQuerySchema.parse(req.query);
    await this.reportService.exportFinancialExcel(
      { ...params, formaPagamento: params.formaPagamento as FormaPagamento | undefined },
      res
    );
  };

  /**
   * GET /api/v1/reports/inventory/excel
   * Gera relatório de estoque em XLSX e inicia o download.
   */
  exportInventoryExcel = async (req: Request, res: Response): Promise<void> => {
    const params = inventoryQuerySchema.parse(req.query);
    await this.reportService.exportInventoryExcel(
      { ...params, orderBy: params.orderBy as 'nome' | 'estoque' | 'preco' | 'createdAt' },
      res
    );
  };

  // ----------------------------------------------------------------
  // Exportação CSV
  // ----------------------------------------------------------------

  exportFinancialCSV = async (req: Request, res: Response): Promise<void> => {
    const params = financialQuerySchema.parse(req.query);
    await this.reportService.exportFinancialCSV(
      { ...params, formaPagamento: params.formaPagamento as FormaPagamento | undefined },
      res
    );
  };

  exportInventoryCSV = async (req: Request, res: Response): Promise<void> => {
    const params = inventoryQuerySchema.parse(req.query);
    await this.reportService.exportInventoryCSV(
      { ...params, orderBy: params.orderBy as 'nome' | 'estoque' | 'preco' | 'createdAt' },
      res
    );
  };
}
