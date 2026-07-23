import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { FavoritoController } from '../controllers/FavoritoController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new FavoritoController();

router.use(authenticate, tenantMiddleware);

router.get('/', asyncHandler(ctrl.findAll));
router.get('/tipo/:tipo', asyncHandler(ctrl.findByTipo));
router.post('/', asyncHandler(ctrl.create));
router.post('/toggle', asyncHandler(ctrl.toggle));
router.put('/reordenar', asyncHandler(ctrl.reordenar));
router.delete('/:id', asyncHandler(ctrl.delete));

export default router;
