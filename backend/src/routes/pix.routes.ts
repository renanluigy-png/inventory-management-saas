import { Router } from 'express';
import { PixController } from '../controllers/PixController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Webhook é público (chamado pelo provedor)
router.post('/webhook', PixController.webhook);

// Demais rotas protegidas
router.use(authenticate);

router.post('/', PixController.create);
router.get('/', authorize('ADMIN', 'GERENTE'), PixController.findAll);
router.get('/:id/status', PixController.getStatus);
router.patch('/:id/cancel', PixController.cancel);
router.get('/sale/:saleId', PixController.listBySale);

export default router;
