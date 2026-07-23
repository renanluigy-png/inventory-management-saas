import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const categoryController = new CategoryController();

// Todas as rotas de categorias exigem autenticação
router.use(authenticate);

// GET  /api/v1/categories          → Lista todas (com paginação e busca)
router.get('/', categoryController.findAll);

// GET  /api/v1/categories/:id      → Busca por ID
router.get('/:id', categoryController.findById);

// POST /api/v1/categories          → Cria nova categoria (ADMIN ou GERENTE)
router.post(
  '/',
  authorize('ADMIN', 'GERENTE'),
  categoryController.create
);

// PUT  /api/v1/categories/:id      → Atualiza categoria (ADMIN ou GERENTE)
router.put(
  '/:id',
  authorize('ADMIN', 'GERENTE'),
  categoryController.update
);

// DELETE /api/v1/categories/:id   → Desativa categoria (apenas ADMIN)
router.delete(
  '/:id',
  authorize('ADMIN'),
  categoryController.delete
);

export default router;
