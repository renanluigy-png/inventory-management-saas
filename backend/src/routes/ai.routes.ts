import { Router } from 'express'
import { AIController } from '../controllers/AIController'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
const ctrl = new AIController()

router.use(authenticate)

// Chat
router.post('/chat', (req, res) => ctrl.chat(req, res))
router.get('/chats', (req, res) => ctrl.getChats(req, res))
router.get('/chats/:id', (req, res) => ctrl.getChat(req, res))
router.delete('/chats/:id', (req, res) => ctrl.deleteChat(req, res))
router.get('/chats/:id/export', (req, res) => ctrl.exportChat(req, res))

// Mensagens
router.patch('/mensagens/:id/favoritar', (req, res) => ctrl.favoriteMessage(req, res))
router.get('/favoritos', (req, res) => ctrl.getFavorites(req, res))

// Insights e análises
router.get('/insights', (req, res) => ctrl.getInsights(req, res))
router.get('/provider', (req, res) => ctrl.getProviderInfo(req, res))

// Busca inteligente
router.post('/busca', (req, res) => ctrl.naturalSearch(req, res))

export default router
