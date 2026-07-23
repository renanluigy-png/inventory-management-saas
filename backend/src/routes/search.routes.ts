import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const searchController = new SearchController();

// GET /api/v1/search?q=texto
router.get('/', authenticate, searchController.search);

export default router;
