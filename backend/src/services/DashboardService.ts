import { DashboardRepository } from '../repositories/DashboardRepository';

export type SalesChartPeriod = '7d' | '30d' | '90d' | '12m';

export class DashboardService {
  private dashboardRepository: DashboardRepository;

  constructor() {
    this.dashboardRepository = new DashboardRepository();
  }

  /** KPIs principais do painel (faturamento, lucro, contadores, caixa). */
  async getMetrics() {
    return this.dashboardRepository.getMetrics();
  }

  /** Top produtos por quantidade vendida. */
  async getTopProducts(limit: number) {
    return this.dashboardRepository.getTopProducts(limit);
  }

  /** Dados de vendas agrupados para exibição em gráfico. */
  async getSalesChart(period: SalesChartPeriod) {
    return this.dashboardRepository.getSalesChart(period);
  }

  /** Fluxo de caixa diário com saldo acumulado. */
  async getCashFlow(days: number) {
    return this.dashboardRepository.getCashFlow(days);
  }

  /** Produtos sem movimentação de venda há pelo menos X dias. */
  async getDeadStock(
    days: number,
    params: { page?: number; limit?: number; search?: string }
  ) {
    return this.dashboardRepository.getDeadStock(days, params);
  }

  /** Top produtos pelo lucro total gerado. */
  async getTopProfit(limit: number) {
    return this.dashboardRepository.getTopProfit(limit);
  }

  /** Clientes que mais compraram (por valor gasto). */
  async getTopCustomers(limit: number) {
    return this.dashboardRepository.getTopCustomers(limit);
  }

  /** Distribuição de vendas por forma de pagamento no período. */
  async getSalesByPayment(days: number) {
    return this.dashboardRepository.getSalesByPayment(days);
  }

  /** Vendas agrupadas por hora do dia de hoje. */
  async getSalesByHour() {
    return this.dashboardRepository.getSalesByHour();
  }
}
