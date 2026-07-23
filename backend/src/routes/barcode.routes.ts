import { Router } from 'express';
import { BarcodeController } from '../controllers/BarcodeController';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

// GET: renderiza PNG/SVG diretamente ou retorna base64
router.get('/generate', BarcodeController.generate);
// POST: aceita body JSON além de query params
router.post('/generate', BarcodeController.generate);
router.post('/batch', BarcodeController.batch);
router.get('/validate', BarcodeController.validate);
router.post('/ean13', BarcodeController.generateEAN13);

export default router;
