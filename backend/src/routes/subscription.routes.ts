import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new SubscriptionController();

router.use(authenticate, tenantMiddleware);

// Empresa autenticada
router.get('/me', asyncHandler(ctrl.getMySubscription));
router.patch('/me/cancel', authorize('ADMIN'), asyncHandler(ctrl.cancelMine));

// Somente MASTER
router.get('/revenue', authorize('MASTER'), asyncHandler(ctrl.getRevenue));
router.post('/process-expired', authorize('MASTER'), asyncHandler(ctrl.processExpired));
router.post('/:companyId/activate', authorize('MASTER'), asyncHandler(ctrl.activate));
router.post('/:companyId/suspend', authorize('MASTER'), asyncHandler(ctrl.suspend));
router.post('/:companyId/renew', authorize('MASTER'), asyncHandler(ctrl.renew));

export default router;
