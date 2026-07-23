import { Router } from 'express';
import { PromotionController } from '../controllers/PromotionController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const promotionController = new PromotionController();

router.use(authenticate);

// GET  /api/v1/promotions
router.get('/', promotionController.findAll);

// GET  /api/v1/promotions/:id
router.get('/:id', promotionController.findById);

// GET  /api/v1/promotions/product/:productId/vigentes
router.get('/product/:productId/vigentes', promotionController.getVigentesParaProduto);

// POST /api/v1/promotions
router.post('/', authorize('ADMIN', 'GERENTE'), promotionController.create);

// PUT  /api/v1/promotions/:id
router.put('/:id', authorize('ADMIN', 'GERENTE'), promotionController.update);

// DELETE /api/v1/promotions/:id
router.delete('/:id', authorize('ADMIN'), promotionController.delete);

export default router;
