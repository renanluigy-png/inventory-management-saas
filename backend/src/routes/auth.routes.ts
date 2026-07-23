import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { loginLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/login  (5 tentativas / minuto)
router.post('/login', loginLimiter, authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/logout-all (encerra todas as sessões)
router.post('/logout-all', authenticate, authController.logoutAll);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// PUT /api/v1/auth/change-password
router.put('/change-password', authenticate, authController.changePassword);

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.me);

// POST /api/v1/auth/register-company — agora restrito ao MASTER
router.post('/register-company', authenticate, authorize('MASTER'), authController.registerCompany);

export default router;
