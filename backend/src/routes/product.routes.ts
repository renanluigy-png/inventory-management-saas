import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadProdutoImagem } from '../middlewares/upload.middleware';

const router = Router();
const productController = new ProductController();

// Todas as rotas de produtos exigem autenticação
router.use(authenticate);

// ----------------------------------------------------------------
// ⚠️ Rotas estáticas ANTES das dinâmicas (:id) para evitar conflito
// ----------------------------------------------------------------

// GET  /api/v1/products/estoque-baixo
router.get('/estoque-baixo', productController.findEstoqueBaixo);

// GET  /api/v1/products/barcode/:codigo
router.get('/barcode/:codigo', productController.findByCodigoBarras);

// ----------------------------------------------------------------
// Rotas de coleção
// ----------------------------------------------------------------

// GET  /api/v1/products
router.get('/', productController.findAll);

// POST /api/v1/products
router.post('/', authorize('ADMIN', 'GERENTE'), productController.create);

// ----------------------------------------------------------------
// Rotas de recurso individual
// ----------------------------------------------------------------

// GET  /api/v1/products/:id
router.get('/:id', productController.findById);

// PUT  /api/v1/products/:id
router.put('/:id', authorize('ADMIN', 'GERENTE'), productController.update);

// DELETE /api/v1/products/:id
router.delete('/:id', authorize('ADMIN'), productController.delete);

// ----------------------------------------------------------------
// Sub-rotas de estoque  (/api/v1/products/:id/estoque)
// ----------------------------------------------------------------

// GET  /api/v1/products/:id/estoque  → Consulta estoque atual + histórico
router.get('/:id/estoque', productController.consultarEstoque);

// POST /api/v1/products/:id/estoque  → Ajuste manual de estoque
router.post(
  '/:id/estoque',
  authorize('ADMIN', 'GERENTE'),
  productController.ajustarEstoque
);

// ----------------------------------------------------------------
// Sub-rotas de imagem  (/api/v1/products/:id/imagem)
// ----------------------------------------------------------------

// POST   /api/v1/products/:id/imagem  → Upload de imagem (multipart, campo: "imagem")
router.post(
  '/:id/imagem',
  authorize('ADMIN', 'GERENTE'),
  uploadProdutoImagem,
  productController.updateImagem
);

// DELETE /api/v1/products/:id/imagem  → Remove imagem do produto
router.delete(
  '/:id/imagem',
  authorize('ADMIN', 'GERENTE'),
  productController.removeImagem
);

export default router;
