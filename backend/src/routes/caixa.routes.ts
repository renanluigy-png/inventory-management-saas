import { Router } from 'express';
import { CaixaController } from '../controllers/CaixaController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const caixaController = new CaixaController();

router.use(authenticate);

// GET  /api/v1/caixa/status
router.get('/status', caixaController.getStatus);

// GET  /api/v1/caixa
router.get('/', authorize('ADMIN', 'GERENTE'), caixaController.findAll);

// GET  /api/v1/caixa/:id
router.get('/:id', authorize('ADMIN', 'GERENTE'), caixaController.findById);

// POST /api/v1/caixa/abrir
router.post('/abrir', authorize('ADMIN', 'GERENTE', 'CAIXA'), caixaController.abrir);

// POST /api/v1/caixa/:id/fechar
router.post('/:id/fechar', authorize('ADMIN', 'GERENTE', 'CAIXA'), caixaController.fechar);

// POST /api/v1/caixa/:id/sangria
router.post('/:id/sangria', authorize('ADMIN', 'GERENTE'), caixaController.sangria);

// POST /api/v1/caixa/:id/suprimento
router.post('/:id/suprimento', authorize('ADMIN', 'GERENTE'), caixaController.suprimento);

export default router;
