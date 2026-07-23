import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { ExportController } from '../controllers/ExportController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new ExportController();

router.use(authenticate, tenantMiddleware);

// GET /export?format=csv|excel|pdf&entidade=products|customers|sales|stock
router.get('/', asyncHandler(ctrl.export));

export default router;
