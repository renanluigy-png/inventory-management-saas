import { Request, Response } from 'express';
import { z } from 'zod';
import { MetaService } from '../services/MetaService';
import { MetaTipo, MetaPeriodo } from '@prisma/client';

const createSchema = z.object({
  tipo: z.nativeEnum(MetaTipo),
  nome: z.string().min(2),
  descricao: z.string().optional(),
  valorAlvo: z.number().positive(),
  periodo: z.nativeEnum(MetaPeriodo),
  inicioEm: z.string().datetime(),
  fimEm: z.string().datetime(),
  entidadeId: z.string().optional(),
  entidadeTipo: z.string().optional(),
});

export class MetaController {
  private svc: MetaService;
  constructor() { this.svc = new MetaService(); }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId;
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const tipo = req.query['tipo'] as MetaTipo | undefined;
    const periodo = req.query['periodo'] as MetaPeriodo | undefined;
    const ativa = req.query['ativa'] === 'true' ? true : req.query['ativa'] === 'false' ? false : undefined;
    const result = await this.svc.findAll({ companyId, tipo, periodo, ativa, page, limit });
    res.status(200).json({ status: 'success', ...result });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const meta = await this.svc.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { meta } });
  };

  findAtivas = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.companyId!;
    const metas = await this.svc.findAtivas(companyId);
    res.status(200).json({ status: 'success', data: { metas } });
  };

  getProgresso = async (req: Request, res: Response): Promise<void> => {
    const result = await this.svc.getProgresso(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { meta: result } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const meta = await this.svc.create({
      ...data,
      inicioEm: new Date(data.inicioEm),
      fimEm: new Date(data.fimEm),
      companyId: req.companyId,
    });
    res.status(201).json({ status: 'success', data: { meta } });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.partial().parse(req.body);
    const meta = await this.svc.update(req.params['id'] as string, {
      ...data,
      inicioEm: data.inicioEm ? new Date(data.inicioEm) : undefined,
      fimEm: data.fimEm ? new Date(data.fimEm) : undefined,
    });
    res.status(200).json({ status: 'success', data: { meta } });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.svc.delete(req.params['id'] as string);
    res.status(204).send();
  };
}
