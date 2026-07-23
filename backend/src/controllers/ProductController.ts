import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { ProductService } from '../services/ProductService';
import { AppError } from '../utils/AppError';

// ----------------------------------------------------------------
// Schemas de validação (Zod)
// ----------------------------------------------------------------

const createSchema = z.object({
  sku: z.string().max(50).trim().toUpperCase().optional(),
  nome: z
    .string({ required_error: 'Nome é obrigatório.' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(200, 'Nome deve ter no máximo 200 caracteres.')
    .trim(),
  descricao: z.string().max(1000).trim().optional(),
  preco: z
    .number({ required_error: 'Preço é obrigatório.' })
    .positive('Preço deve ser um valor positivo.'),
  precoCusto: z
    .number()
    .positive('Preço de custo deve ser um valor positivo.')
    .optional(),
  estoque: z.number().int('Estoque deve ser um número inteiro.').min(0).default(0),
  estoqueMinimo: z
    .number()
    .int('Estoque mínimo deve ser um número inteiro.')
    .min(0)
    .default(0),
  codigoBarras: z.string().max(50).trim().optional(),
  unidade: z.string().max(10).trim().default('UN'),
  categoryId: z.string().uuid('ID de categoria inválido.').optional(),
});

const updateSchema = z.object({
  sku: z.string().max(50).trim().toUpperCase().nullable().optional(),
  nome: z.string().min(2).max(200).trim().optional(),
  descricao: z.string().max(1000).trim().nullable().optional(),
  preco: z.number().positive('Preço deve ser um valor positivo.').optional(),
  precoCusto: z
    .number()
    .positive('Preço de custo deve ser um valor positivo.')
    .nullable()
    .optional(),
  estoque: z.number().int().min(0).optional(),
  estoqueMinimo: z.number().int().min(0).optional(),
  codigoBarras: z.string().max(50).trim().nullable().optional(),
  unidade: z.string().max(10).trim().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  ativo: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  orderBy: z.enum(['nome', 'preco', 'estoque', 'createdAt']).default('nome'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema de ajuste de estoque com union discriminada
const ajusteEstoqueSchema = z.union([
  z.object({
    tipo: z.enum(['ENTRADA', 'SAIDA']),
    quantidade: z
      .number({ required_error: 'Quantidade é obrigatória para ENTRADA/SAIDA.' })
      .int('Quantidade deve ser um número inteiro.')
      .positive('Quantidade deve ser positiva.'),
    motivo: z.string().max(500).trim().optional(),
  }),
  z.object({
    tipo: z.literal('AJUSTE'),
    novoEstoque: z
      .number({ required_error: 'novoEstoque é obrigatório para AJUSTE.' })
      .int('Novo estoque deve ser um número inteiro.')
      .min(0, 'Estoque não pode ser negativo.'),
    motivo: z.string().max(500).trim().optional(),
  }),
]);

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // GET /api/v1/products
  findAll = async (req: Request, res: Response): Promise<void> => {
    const params = querySchema.parse(req.query);
    const companyId = req.user!.companyId;
    const result = await this.productService.findAll({ ...params, companyId });

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/products/estoque-baixo  (registro ANTES de /:id)
  findEstoqueBaixo = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = paginationSchema.parse(req.query);
    const companyId = req.user!.companyId;
    const result = await this.productService.findComEstoqueBaixo({ page, limit, companyId });

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/products/barcode/:codigo  (registro ANTES de /:id)
  findByCodigoBarras = async (req: Request, res: Response): Promise<void> => {
    const { codigo } = req.params as { codigo: string };
    const product = await this.productService.findByCodigoBarras(codigo);

    res.status(200).json({ status: 'success', data: { product } });
  };

  // GET /api/v1/products/:id
  findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const product = await this.productService.findById(id);

    res.status(200).json({ status: 'success', data: { product } });
  };

  // GET /api/v1/products/:id/estoque
  consultarEstoque = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const { page, limit } = paginationSchema.parse(req.query);

    const result = await this.productService.consultarEstoque(id, { page, limit });

    res.status(200).json({ status: 'success', data: result });
  };

  // POST /api/v1/products/:id/estoque
  ajustarEstoque = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = ajusteEstoqueSchema.parse(req.body);
    const userId = req.user!.sub;

    const result = await this.productService.ajustarEstoque(id, {
      ...body,
      userId,
    });

    res.status(200).json({
      status: 'success',
      message: 'Estoque ajustado com sucesso.',
      data: result,
    });
  };

  // POST /api/v1/products/:id/imagem  (multipart/form-data, campo: "imagem")
  updateImagem = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };

    if (!req.file) {
      throw new AppError('Nenhum arquivo enviado. Envie o campo "imagem".', 400);
    }

    // Caminho público usado pelo frontend: /uploads/products/filename.ext
    const imagemUrl = `/uploads/products/${req.file.filename}`;
    const produto = await this.productService.updateImagem(id, imagemUrl);

    res.status(200).json({
      status: 'success',
      message: 'Imagem atualizada com sucesso.',
      data: { imagemUrl: produto.imagemUrl },
    });
  };

  // DELETE /api/v1/products/:id/imagem
  removeImagem = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    await this.productService.removeImagem(id);

    res.status(204).send();
  };

  // POST /api/v1/products
  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const product = await this.productService.create({ ...body, companyId });

    res.status(201).json({
      status: 'success',
      message: 'Produto criado com sucesso.',
      data: { product },
    });
  };

  // PUT /api/v1/products/:id
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const product = await this.productService.update(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Produto atualizado com sucesso.',
      data: { product },
    });
  };

  // DELETE /api/v1/products/:id  (soft delete)
  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    await this.productService.delete(id);

    res.status(204).send();
  };
}
