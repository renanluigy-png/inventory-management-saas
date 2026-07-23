import { Request, Response } from 'express';
import { z } from 'zod';
import { CategoryService } from '../services/CategoryService';

// ----------------------------------------------------------------
// Schemas de validação (Zod)
// ----------------------------------------------------------------

const createSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório.' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.')
    .trim(),
  descricao: z.string().max(500).trim().optional(),
});

const updateSchema = z.object({
  nome: z.string().min(2).max(100).trim().optional(),
  descricao: z.string().max(500).trim().nullable().optional(),
  ativo: z.boolean().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  orderBy: z.enum(['nome', 'createdAt', 'updatedAt']).default('nome'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  // GET /api/v1/categories
  findAll = async (req: Request, res: Response): Promise<void> => {
    const params = querySchema.parse(req.query);
    const companyId = req.user!.companyId;
    const result = await this.categoryService.findAll({ ...params, companyId });

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/categories/:id
  findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const category = await this.categoryService.findById(id);

    res.status(200).json({ status: 'success', data: { category } });
  };

  // POST /api/v1/categories
  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const category = await this.categoryService.create({ ...body, companyId });

    res.status(201).json({
      status: 'success',
      message: 'Categoria criada com sucesso.',
      data: { category },
    });
  };

  // PUT /api/v1/categories/:id
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const category = await this.categoryService.update(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Categoria atualizada com sucesso.',
      data: { category },
    });
  };

  // DELETE /api/v1/categories/:id
  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    await this.categoryService.delete(id);

    res.status(204).send();
  };
}
