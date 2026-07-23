import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const customerController = new CustomerController();

// Todas as rotas de clientes exigem autenticação
router.use(authenticate);

// GET  /api/v1/customers          → Lista com paginação, filtros e ordenação
router.get('/', customerController.findAll);

// GET  /api/v1/customers/:id      → Busca por ID
router.get('/:id', customerController.findById);

// POST /api/v1/customers          → Cadastra novo cliente
// Funcionários e caixas também podem cadastrar clientes (ex: durante uma venda)
router.post('/', customerController.create);

// PUT  /api/v1/customers/:id      → Atualização completa (ADMIN ou GERENTE)
router.put(
  '/:id',
  authorize('ADMIN', 'GERENTE'),
  customerController.update
);

// PATCH /api/v1/customers/:id     → Atualização parcial (ADMIN ou GERENTE)
router.patch(
  '/:id',
  authorize('ADMIN', 'GERENTE'),
  customerController.partialUpdate
);

// DELETE /api/v1/customers/:id   → Soft delete — desativa o cliente (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  customerController.delete
);

export default router;
