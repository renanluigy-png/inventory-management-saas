import { Request, Response } from 'express';
import { z } from 'zod';
import { FavoritoService } from '../services/FavoritoService';

const createSchema = z.object({
  tipo: z.string(),
  entidadeId: z.string().optional(),
  label: z.string().min(1),
  url: z.string().optional(),
  dados: z.record(z.unknown()).optional(),
});

const toggleSchema = z.object({
  tipo: z.string(),
  entidadeId: z.string().optional(),
  label: z.string(),
  url: z.string().optional(),
  dados: z.record(z.unknown()).optional(),
});

export class FavoritoController {
  private svc: FavoritoService;
  constructor() { this.svc = new FavoritoService(); }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const result = await this.svc.findByUser(req.user!.sub);
    res.status(200).json({ status: 'success', data: result });
  };

  findByTipo = async (req: Request, res: Response): Promise<void> => {
    const items = await this.svc.findByTipo(req.user!.sub, req.params['tipo'] as string);
    res.status(200).json({ status: 'success', data: { items } });
  };

  toggle = async (req: Request, res: Response): Promise<void> => {
    const data = toggleSchema.parse(req.body);
    const result = await this.svc.toggle({
      ...data,
      userId: req.user!.sub,
      companyId: req.companyId,
    });
    res.status(200).json({ status: 'success', data: result });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const fav = await this.svc.create({
      ...data,
      userId: req.user!.sub,
      companyId: req.companyId,
    });
    res.status(201).json({ status: 'success', data: { favorito: fav } });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.svc.delete(req.params['id'] as string, req.user!.sub);
    res.status(204).send();
  };

  reordenar = async (req: Request, res: Response): Promise<void> => {
    const { ordens } = z.object({ ordens: z.array(z.object({ id: z.string(), ordem: z.number() })) }).parse(req.body);
    await this.svc.reordenar(req.user!.sub, ordens);
    res.status(200).json({ status: 'success' });
  };
}
