import { Router } from 'express';
import multer from 'multer';
import { SystemController } from '../controllers/SystemController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
const systemController = new SystemController();

// Upload em memória apenas para o restore (arquivo ZIP temporário)
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .zip são aceitos para restore.'));
    }
  },
}).single('backup');

// ----------------------------------------------------------------
// Rotas públicas
// ----------------------------------------------------------------
router.get('/health', systemController.health);
router.get('/check-setup', systemController.checkSetup);

// ----------------------------------------------------------------
// Rotas protegidas — somente ADMIN
// ----------------------------------------------------------------
router.use(authenticate, authorize('ADMIN'));

// Métricas do servidor
router.get('/metrics', systemController.metrics);

// Backup
router.get('/backup', systemController.listBackups);
router.post('/backup', systemController.createBackup);
router.get('/backup/:filename', systemController.downloadBackup);

// Restore
router.post('/restore', uploadZip, systemController.restore);

export default router;
