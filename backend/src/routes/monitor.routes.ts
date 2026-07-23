import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { MonitorController } from '../controllers/MonitorController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new MonitorController();

router.get('/status', asyncHandler(ctrl.getAPIStatus));

router.use(authenticate);
router.get('/platform', authorize('ADMIN', 'MASTER'), asyncHandler(ctrl.getPlatformStats));
router.get('/server', authorize('ADMIN', 'MASTER'), ctrl.getServerStats);
router.get('/online-users', authorize('ADMIN', 'MASTER'), ctrl.getOnlineUsers);

export default router;
