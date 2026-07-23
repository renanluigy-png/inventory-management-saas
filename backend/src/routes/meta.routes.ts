import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { MetaController } from '../controllers/MetaController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new MetaController();

router.use(authenticate, tenantMiddleware);

router.get('/', asyncHandler(ctrl.findAll));
router.get('/ativas', asyncHandler(ctrl.findAtivas));
router.get('/:id', asyncHandler(ctrl.findById));
router.get('/:id/progresso', asyncHandler(ctrl.getProgresso));
router.post('/', authorize('ADMIN', 'GERENTE'), asyncHandler(ctrl.create));
router.put('/:id', authorize('ADMIN', 'GERENTE'), asyncHandler(ctrl.update));
router.delete('/:id', authorize('ADMIN'), asyncHandler(ctrl.delete));

export default router;
