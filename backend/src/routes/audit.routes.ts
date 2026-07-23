import { Router } from 'express';
import { AuditController } from '../controllers/AuditController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const auditController = new AuditController();

router.use(authenticate);

// GET /api/v1/audit — somente ADMIN pode visualizar logs de auditoria
router.get('/', authorize('ADMIN'), auditController.findAll);

export default router;
