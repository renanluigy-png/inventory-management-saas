import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { AgendaController } from '../controllers/AgendaController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new AgendaController();

router.use(authenticate, tenantMiddleware);

router.get('/', asyncHandler(ctrl.findAll));
router.get('/proximos', asyncHandler(ctrl.findProximos));
router.get('/mes', asyncHandler(ctrl.getMes));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.patch('/:id/concluir', asyncHandler(ctrl.markConcluido));
router.delete('/:id', asyncHandler(ctrl.delete));

export default router;
