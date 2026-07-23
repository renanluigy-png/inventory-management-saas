import { Router } from 'express';
import { MasterController } from '../controllers/MasterController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const ctrl = new MasterController();

router.use(authenticate, authorize('MASTER'));

// Stats
router.get('/stats',                                asyncHandler(ctrl.getStats));

// Monitor
router.get('/monitor',                              asyncHandler(ctrl.getMonitor));

// Companies
router.get('/companies',                            asyncHandler(ctrl.listCompanies));
router.post('/companies',                           asyncHandler(ctrl.createCompany));
router.get('/companies/:id',                        asyncHandler(ctrl.getCompany));
router.put('/companies/:id',                        asyncHandler(ctrl.updateCompany));
router.delete('/companies/:id',                     asyncHandler(ctrl.deleteCompany));
router.patch('/companies/:id/suspend',              asyncHandler(ctrl.suspendCompany));
router.patch('/companies/:id/activate',             asyncHandler(ctrl.activateCompany));
router.patch('/companies/:id/plan',                 asyncHandler(ctrl.changeCompanyPlan));
router.post('/companies/:id/impersonate',           asyncHandler(ctrl.impersonateCompany));
router.post('/companies/:id/reset-admin-password',  asyncHandler(ctrl.resetAdminPassword));

// Users
router.get('/users',                                asyncHandler(ctrl.listUsers));
router.patch('/users/:id/block',                    asyncHandler(ctrl.blockUser));
router.delete('/users/:id',                         asyncHandler(ctrl.deleteUser));
router.post('/users/:id/reset-password',            asyncHandler(ctrl.resetUserPassword));

// Audit
router.get('/audit',                                asyncHandler(ctrl.getAuditLogs));

// Plans
router.post('/plans/seed',                          asyncHandler(ctrl.seedPlans));

export default router;
