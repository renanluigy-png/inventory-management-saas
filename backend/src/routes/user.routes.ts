import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

router.use(authenticate);

// GET    /api/v1/users
router.get('/', authorize('ADMIN', 'GERENTE'), userController.findAll);

// GET    /api/v1/users/:id
router.get('/:id', authorize('ADMIN', 'GERENTE'), userController.findById);

// POST   /api/v1/users
router.post('/', authorize('ADMIN'), userController.create);

// PUT    /api/v1/users/:id
router.put('/:id', authorize('ADMIN'), userController.update);

// PATCH  /api/v1/users/:id/password  (admin redefine senha de outro usuário)
router.patch('/:id/password', authorize('ADMIN'), userController.resetPassword);

// PATCH  /api/v1/users/:id/deactivate
router.patch('/:id/deactivate', authorize('ADMIN'), userController.deactivate);

// PATCH  /api/v1/users/:id/reactivate
router.patch('/:id/reactivate', authorize('ADMIN'), userController.reactivate);

export default router;
