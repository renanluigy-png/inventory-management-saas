import { Router } from 'express';
import { FiscalController } from '../controllers/FiscalController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/providers', FiscalController.providers);
router.post('/emitir', authorize('ADMIN', 'GERENTE', 'CAIXA'), FiscalController.emitir);
router.get('/', authorize('ADMIN', 'GERENTE'), FiscalController.findAll);
router.get('/sale/:saleId', FiscalController.listBySale);
router.get('/:id', FiscalController.consultar);
router.patch('/:id/cancelar', authorize('ADMIN', 'GERENTE'), FiscalController.cancelar);

export default router;
