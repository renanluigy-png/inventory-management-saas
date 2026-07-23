import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { DashboardLayoutController } from '../controllers/DashboardLayoutController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new DashboardLayoutController();

router.use(authenticate, tenantMiddleware);

router.get('/', asyncHandler(ctrl.getLayout));
router.put('/', asyncHandler(ctrl.saveLayout));
router.post('/reset', asyncHandler(ctrl.resetLayout));
router.get('/defaults', ctrl.getDefaults);

export default router;
