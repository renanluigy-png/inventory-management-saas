import { Router } from 'express';
import { WhatsAppController } from '../controllers/WhatsAppController';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/provider', WhatsAppController.provider);
router.post('/texto', WhatsAppController.enviarTexto);
router.post('/orcamento', WhatsAppController.enviarOrcamento);
router.post('/comprovante', WhatsAppController.enviarComprovante);
router.post('/nota-fiscal', WhatsAppController.enviarNotaFiscal);
router.post('/promocao', authorize('ADMIN', 'GERENTE'), WhatsAppController.enviarPromocao);
router.post('/aviso-estoque', authorize('ADMIN', 'GERENTE'), WhatsAppController.enviarAvisoEstoque);
router.post('/cobranca', authorize('ADMIN', 'GERENTE'), WhatsAppController.enviarCobranca);

export default router;
