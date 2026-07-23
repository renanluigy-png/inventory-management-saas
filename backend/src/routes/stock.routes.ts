import { Router } from 'express';
import { StockController } from '../controllers/StockController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const stockController = new StockController();

// Todas as rotas de estoque exigem autenticação
router.use(authenticate);

// ----------------------------------------------------------------
// ⚠️ Rotas estáticas antes das dinâmicas para evitar conflito
// ----------------------------------------------------------------

// GET  /api/v1/stock/history  → Histórico completo de movimentações
router.get('/history', stockController.listarHistorico);

// GET  /api/v1/stock/alerts   → Alertas: sem estoque + estoque baixo
router.get('/alerts', stockController.listarAlertas);

// ----------------------------------------------------------------
// Visão geral do estoque atual por produto
// ----------------------------------------------------------------

// GET  /api/v1/stock          → Estoque atual de todos os produtos
router.get('/', stockController.listarEstoque);

// ----------------------------------------------------------------
// Operações de movimentação (escrita)
// ----------------------------------------------------------------

// POST /api/v1/stock/entry    → Entrada de estoque
router.post(
  '/entry',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO'),
  stockController.registrarEntrada
);

// POST /api/v1/stock/output   → Saída manual de estoque
router.post(
  '/output',
  authorize('ADMIN', 'GERENTE'),
  stockController.registrarSaida
);

// POST /api/v1/stock/adjust   → Ajuste de estoque (valor absoluto)
router.post(
  '/adjust',
  authorize('ADMIN', 'GERENTE'),
  stockController.ajustarEstoque
);

// POST /api/v1/stock/loss     → Baixa por perda (BAIXA_PERDA) ou avaria (BAIXA_AVARIA)
router.post(
  '/loss',
  authorize('ADMIN', 'GERENTE'),
  stockController.registrarBaixa
);

// POST /api/v1/stock/return   → Devolução de mercadoria
router.post(
  '/return',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO'),
  stockController.registrarDevolucao
);

export default router;
