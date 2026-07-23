import { Router } from 'express';
import { InviteController } from '../controllers/InviteController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new InviteController();

// Rotas públicas (token de convite)
router.get('/validate', asyncHandler(ctrl.validate));
router.post('/accept', asyncHandler(ctrl.accept));

// Rotas autenticadas + tenant
router.use(authenticate, tenantMiddleware);

router.post('/', authorize('ADMIN', 'MASTER'), asyncHandler(ctrl.send));
router.get('/', authorize('ADMIN', 'MASTER'), asyncHandler(ctrl.list));
router.delete('/:id', authorize('ADMIN', 'MASTER'), asyncHandler(ctrl.revoke));

export default router;
