import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new PlanController();

// Listagem pública (sem auth) — qualquer visitante pode ver os planos
router.get('/', asyncHandler(ctrl.findAll));
router.get('/:id', asyncHandler(ctrl.findById));

// Autenticados
router.get('/me/limits', authenticate, asyncHandler(ctrl.getMyLimits));

// Somente MASTER
router.post('/seed', authenticate, authorize('MASTER'), asyncHandler(ctrl.seedDefaults));

export default router;
