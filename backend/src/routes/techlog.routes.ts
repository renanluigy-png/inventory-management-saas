import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { TechLogController } from '../controllers/TechLogController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new TechLogController();

router.use(authenticate, tenantMiddleware, authorize('ADMIN', 'MASTER'));

router.get('/', asyncHandler(ctrl.findAll));
router.get('/summary', asyncHandler(ctrl.getSummary));
router.delete('/cleanup', asyncHandler(ctrl.cleanup));

export default router;
