import { Router } from 'express';
import multer from 'multer';
import { StorageController } from '../controllers/StorageController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

const inMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.get('/provider', StorageController.provider);
router.get('/', StorageController.findAll);
router.post('/imagem', inMemory.single('file'), StorageController.uploadImagem);
router.post('/documento', inMemory.single('file'), StorageController.uploadDocumento);
router.delete('/:id', authorize('ADMIN', 'GERENTE'), StorageController.delete);

export default router;
