import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { HistoricoController } from '../controllers/HistoricoController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new HistoricoController();

router.use(authenticate, tenantMiddleware);

router.get('/', authorize('ADMIN', 'GERENTE'), asyncHandler(ctrl.findAll));
router.get('/:entidade/:id', asyncHandler(ctrl.findByEntidade));

export default router;
