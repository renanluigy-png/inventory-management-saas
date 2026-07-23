import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

router.use(authenticate);

// GET    /api/v1/notifications
router.get('/', notificationController.findAll);

// PATCH  /api/v1/notifications/read-all
router.patch('/read-all', notificationController.markAllAsRead);

// POST   /api/v1/notifications/check-alerts  (ADMIN)
router.post('/check-alerts', authorize('ADMIN'), notificationController.checkAlerts);

// PATCH  /api/v1/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/v1/notifications/:id
router.delete('/:id', notificationController.delete);

export default router;
