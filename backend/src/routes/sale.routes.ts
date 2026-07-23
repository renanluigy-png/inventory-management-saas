import { Router } from 'express';
import { SaleController } from '../controllers/SaleController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const saleController = new SaleController();

// Todas as rotas de vendas exigem autenticação
router.use(authenticate);

// ----------------------------------------------------------------
// Leitura
// ----------------------------------------------------------------

// GET  /api/v1/sales            → lista com filtros completos
router.get('/', saleController.findAll);

// GET  /api/v1/sales/:id        → venda completa com itens
router.get('/:id', saleController.findById);

// ----------------------------------------------------------------
// Abertura e atualização do cabeçalho
// ----------------------------------------------------------------

// POST   /api/v1/sales           → abre nova venda (status ABERTA)
router.post(
  '/',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.criar
);

// PATCH  /api/v1/sales/:id       → atualiza cabeçalho (cliente, desconto, pagamento, obs)
router.patch(
  '/:id',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.atualizar
);

// ----------------------------------------------------------------
// Itens da venda
// ----------------------------------------------------------------

// POST   /api/v1/sales/:id/items          → adiciona item (por productId, sku ou codigoBarras)
router.post(
  '/:id/items',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.adicionarItem
);

// PATCH  /api/v1/sales/:id/items/:itemId  → atualiza quantidade ou desconto do item
router.patch(
  '/:id/items/:itemId',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.atualizarItem
);

// DELETE /api/v1/sales/:id/items/:itemId  → remove item da venda
router.delete(
  '/:id/items/:itemId',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.removerItem
);

// ----------------------------------------------------------------
// Finalização e cancelamento
// ⚠️  Rotas estáticas (:id/finalize, :id/cancel) antes de /:id
// ----------------------------------------------------------------

// POST   /api/v1/sales/:id/finalize → finaliza + baixa estoque + movimenta caixa
router.post(
  '/:id/finalize',
  authorize('ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA'),
  saleController.finalizar
);

// POST   /api/v1/sales/:id/cancel   → cancela explicitamente com observação opcional
router.post(
  '/:id/cancel',
  authorize('ADMIN', 'GERENTE'),
  saleController.cancelarComObservacao
);

// DELETE /api/v1/sales/:id          → cancela (alias sem corpo)
router.delete(
  '/:id',
  authorize('ADMIN', 'GERENTE'),
  saleController.cancelar
);

export default router;
