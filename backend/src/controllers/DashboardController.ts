import { Request, Response } from 'express';
import { z } from 'zod';
import { DashboardService, SalesChartPeriod } from '../services/DashboardService';

// ----------------------------------------------------------------
// Schemas de validação
// ----------------------------------------------------------------

const topQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
});

const salesChartSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '12m']).default('30d'),
});

const cashFlowSchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

const deadStockSchema = z.object({
  days: z.coerce.number().int().positive().default(60),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * GET /api/v1/dashboard
   * KPIs principais: faturamento, lucro, contadores e caixa atual.
   */
  getMetrics = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getMetrics();
    res.status(200).json({ status: 'success', data });
  };

  /**
   * GET /api/v1/dashboard/top-products?limit=10
   * Produtos mais vendidos por quantidade.
   */
  getTopProducts = async (req: Request, res: Response): Promise<void> => {
    const { limit } = topQuerySchema.parse(req.query);
    const data = await this.dashboardService.getTopProducts(limit);
    res.status(200).json({ status: 'success', data });
  };

  /**
   * GET /api/v1/dashboard/sales-chart?period=30d
   * Dados de vendas agrupados por período para exibição em gráficos.
   */
  getSalesChart = async (req: Request, res: Response): Promise<void> => {
    const { period } = salesChartSchema.parse(req.query);
    const data = await this.dashboardService.getSalesChart(period as SalesChartPeriod);
    res.status(200).json({ status: 'success', period, data });
  };

  /**
   * GET /api/v1/dashboard/cash-flow?days=30
   * Fluxo de caixa diário (entradas, saídas, saldo acumulado).
   */
  getCashFlow = async (req: Request, res: Response): Promise<void> => {
    const { days } = cashFlowSchema.parse(req.query);
    const data = await this.dashboardService.getCashFlow(days);
    res.status(200).json({ status: 'success', days, data });
  };

  /**
   * GET /api/v1/dashboard/dead-stock?days=60&page=1&limit=20
   * Produtos sem venda há pelo menos X dias (estoque parado).
   */
  getDeadStock = async (req: Request, res: Response): Promise<void> => {
    const { days, ...params } = deadStockSchema.parse(req.query);
    const result = await this.dashboardService.getDeadStock(days, params);
    res.status(200).json({ status: 'success', days, ...result });
  };

  /**
   * GET /api/v1/dashboard/top-profit?limit=10
   * Produtos mais lucrativos em valor absoluto.
   */
  getTopProfit = async (req: Request, res: Response): Promise<void> => {
    const { limit } = topQuerySchema.parse(req.query);
    const data = await this.dashboardService.getTopProfit(limit);
    res.status(200).json({ status: 'success', data });
  };

  /**
   * GET /api/v1/dashboard/top-customers?limit=10
   * Clientes que mais compraram por valor total gasto.
   */
  getTopCustomers = async (req: Request, res: Response): Promise<void> => {
    const { limit } = topQuerySchema.parse(req.query);
    const data = await this.dashboardService.getTopCustomers(limit);
    res.status(200).json({ status: 'success', data });
  };

  /**
   * GET /api/v1/dashboard/sales-by-payment?days=30
   * Distribuição de vendas por forma de pagamento.
   */
  getSalesByPayment = async (req: Request, res: Response): Promise<void> => {
    const { days } = cashFlowSchema.parse(req.query);
    const data = await this.dashboardService.getSalesByPayment(days);
    res.status(200).json({ status: 'success', days, data });
  };

  /**
   * GET /api/v1/dashboard/sales-by-hour
   * Vendas agrupadas por hora do dia de hoje.
   */
  getSalesByHour = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getSalesByHour();
    res.status(200).json({ status: 'success', data });
  };
}
