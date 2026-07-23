import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const settingsController = new SettingsController();

router.use(authenticate);

// GET /api/v1/settings — qualquer usuário autenticado pode ler as configurações
router.get('/', settingsController.get);

// PUT /api/v1/settings — somente ADMIN pode alterar
router.put('/', authorize('ADMIN'), settingsController.update);

export default router;
