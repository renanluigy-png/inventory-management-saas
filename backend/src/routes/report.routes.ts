import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const reportController = new ReportController();

// Todas as rotas de relatórios exigem autenticação
router.use(authenticate);

// Permissões: ADMIN e GERENTE
const adminGerente = authorize('ADMIN', 'GERENTE');

// ----------------------------------------------------------------
// ⚠️  Rotas de exportação (/pdf, /excel) antes das raízes
// ----------------------------------------------------------------

// GET /api/v1/reports/financial/pdf   → download do relatório financeiro em PDF
router.get('/financial/pdf', adminGerente, reportController.exportFinancialPDF);

// GET /api/v1/reports/financial/excel → download do relatório financeiro em Excel
router.get('/financial/excel', adminGerente, reportController.exportFinancialExcel);

// GET /api/v1/reports/financial       → relatório financeiro (JSON paginado)
router.get('/financial', adminGerente, reportController.getFinancialReport);

// GET /api/v1/reports/inventory/pdf   → download do relatório de estoque em PDF
router.get('/inventory/pdf', adminGerente, reportController.exportInventoryPDF);

// GET /api/v1/reports/inventory/excel → download do relatório de estoque em Excel
router.get('/inventory/excel', adminGerente, reportController.exportInventoryExcel);

// GET /api/v1/reports/inventory       → relatório de estoque (JSON paginado)
router.get('/inventory', adminGerente, reportController.getInventoryReport);

// GET /api/v1/reports/financial/csv   → download do relatório financeiro em CSV
router.get('/financial/csv', adminGerente, reportController.exportFinancialCSV);

// GET /api/v1/reports/inventory/csv   → download do relatório de estoque em CSV
router.get('/inventory/csv', adminGerente, reportController.exportInventoryCSV);

export default router;
