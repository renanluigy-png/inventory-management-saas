import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Todas as rotas do dashboard exigem autenticação
router.use(authenticate);

// Permissões: ADMIN e GERENTE
const adminGerente = authorize('ADMIN', 'GERENTE');

// ----------------------------------------------------------------
// ⚠️  Rotas estáticas declaradas antes da raiz para evitar conflito
// ----------------------------------------------------------------

// GET /api/v1/dashboard/top-products → top produtos por quantidade
router.get('/top-products', adminGerente, dashboardController.getTopProducts);

// GET /api/v1/dashboard/top-profit   → top produtos por lucro
router.get('/top-profit', adminGerente, dashboardController.getTopProfit);

// GET /api/v1/dashboard/top-customers → clientes que mais compraram
router.get('/top-customers', adminGerente, dashboardController.getTopCustomers);

// GET /api/v1/dashboard/sales-chart  → dados de vendas para gráfico
router.get('/sales-chart', adminGerente, dashboardController.getSalesChart);

// GET /api/v1/dashboard/cash-flow    → fluxo de caixa diário
router.get('/cash-flow', adminGerente, dashboardController.getCashFlow);

// GET /api/v1/dashboard/dead-stock   → produtos sem venda (estoque parado)
router.get('/dead-stock', adminGerente, dashboardController.getDeadStock);

// GET /api/v1/dashboard/sales-by-payment → distribuição por forma de pagamento
router.get('/sales-by-payment', adminGerente, dashboardController.getSalesByPayment);

// GET /api/v1/dashboard/sales-by-hour → vendas por hora do dia de hoje
router.get('/sales-by-hour', adminGerente, dashboardController.getSalesByHour);

// GET /api/v1/dashboard              → KPIs principais do painel
router.get('/', adminGerente, dashboardController.getMetrics);

export default router;
