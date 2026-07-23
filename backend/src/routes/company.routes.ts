import { Router } from 'express';
import { CompanyController } from '../controllers/CompanyController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new CompanyController();

// Todas as rotas requerem autenticação + validação de tenant
router.use(authenticate, tenantMiddleware);

// Empresa do usuário autenticado
router.get('/me', asyncHandler(ctrl.getMyCompany));
router.put('/me', authorize('ADMIN'), asyncHandler(ctrl.update));
router.get('/me/usage', asyncHandler(ctrl.getUsage));
router.get('/me/settings', asyncHandler(ctrl.getSettings));
router.put('/me/settings', authorize('ADMIN'), asyncHandler(ctrl.updateSettings));
router.get('/me/theme', asyncHandler(ctrl.getTheme));
router.put('/me/theme', authorize('ADMIN'), asyncHandler(ctrl.updateTheme));

// Acesso por ID (MASTER pode ver qualquer empresa)
router.get('/:id', authorize('MASTER', 'ADMIN'), asyncHandler(ctrl.findById));
router.put('/:id', authorize('MASTER'), asyncHandler(ctrl.update));

// Ações de plataforma (somente MASTER)
router.post('/', authorize('MASTER'), asyncHandler(ctrl.create));
router.patch('/:id/suspend', authorize('MASTER'), asyncHandler(ctrl.suspend));
router.patch('/:id/activate', authorize('MASTER'), asyncHandler(ctrl.activate));
router.patch('/:id/plan', authorize('MASTER'), asyncHandler(ctrl.changePlan));

export default router;
