import { Request, Response } from 'express';
import { z } from 'zod';
import { PromotionService } from '../services/PromotionService';

const createSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  tipo: z.enum(['PERCENTUAL', 'VALOR_FIXO', 'PRECO_ESPECIAL']),
  valor: z.number().positive(),
  dataInicio: z.string().datetime().transform((s) => new Date(s)),
  dataFim: z.string().datetime().transform((s) => new Date(s)).optional(),
  produtoIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  tipo: z.enum(['PERCENTUAL', 'VALOR_FIXO', 'PRECO_ESPECIAL']).optional(),
  valor: z.number().positive().optional(),
  ativo: z.boolean().optional(),
  dataInicio: z.string().datetime().transform((s) => new Date(s)).optional(),
  dataFim: z.string().datetime().transform((s) => new Date(s)).nullable().optional(),
  produtoIds: z.array(z.string().uuid()).optional(),
});

export class PromotionController {
  private promotionService: PromotionService;

  constructor() {
    this.promotionService = new PromotionService();
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const search = req.query['search'] as string | undefined;
    const ativo = req.query['ativo'] !== undefined ? req.query['ativo'] === 'true' : undefined;
    const vigente = req.query['vigente'] === 'true';

    const result = await this.promotionService.findAll({ page, limit, search, ativo, vigente });
    res.status(200).json({ status: 'success', ...result });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const promo = await this.promotionService.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { promocao: promo } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const promo = await this.promotionService.create(data);
    res.status(201).json({ status: 'success', data: { promocao: promo } });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = updateSchema.parse(req.body);
    const promo = await this.promotionService.update(req.params['id'] as string, data);
    res.status(200).json({ status: 'success', data: { promocao: promo } });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.promotionService.delete(req.params['id'] as string);
    res.status(204).send();
  };

  getVigentesParaProduto = async (req: Request, res: Response): Promise<void> => {
    const data = await this.promotionService.getVigentesParaProduto(req.params['productId'] as string);
    res.status(200).json({ status: 'success', data });
  };
}
