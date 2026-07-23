import { Request, Response } from 'express';
import { z } from 'zod';
import { AgendaService } from '../services/AgendaService';
import { EventoTipo } from '@prisma/client';

const createSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.nativeEnum(EventoTipo).optional(),
  inicio: z.string().datetime(),
  fim: z.string().datetime().optional(),
  diaTodo: z.boolean().optional(),
  cor: z.string().optional(),
  entidadeId: z.string().optional(),
  entidadeTipo: z.string().optional(),
});

export class AgendaController {
  private svc: AgendaService;
  constructor() { this.svc = new AgendaService(); }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const companyId = req.companyId;
    const result = await this.svc.findAll({
      userId,
      companyId,
      tipo: req.query['tipo'] as EventoTipo | undefined,
      concluido: req.query['concluido'] === 'true' ? true : req.query['concluido'] === 'false' ? false : undefined,
      inicio: req.query['inicio'] as string | undefined,
      fim: req.query['fim'] as string | undefined,
    });
    res.status(200).json({ status: 'success', data: { eventos: result } });
  };

  findProximos = async (req: Request, res: Response): Promise<void> => {
    const eventos = await this.svc.findProximos(req.user!.sub, req.companyId);
    res.status(200).json({ status: 'success', data: { eventos } });
  };

  getMes = async (req: Request, res: Response): Promise<void> => {
    const ano = Number(req.query['ano']) || new Date().getFullYear();
    const mes = Number(req.query['mes']) || new Date().getMonth() + 1;
    const eventos = await this.svc.getEventosMes(req.user!.sub, req.companyId, ano, mes);
    res.status(200).json({ status: 'success', data: { eventos } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const evento = await this.svc.create({
      ...data,
      inicio: new Date(data.inicio),
      fim: data.fim ? new Date(data.fim) : undefined,
      userId: req.user!.sub,
      companyId: req.companyId,
    });
    res.status(201).json({ status: 'success', data: { evento } });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.partial().parse(req.body);
    const evento = await this.svc.update(req.params['id'] as string, req.user!.sub, {
      ...data,
      inicio: data.inicio ? new Date(data.inicio) : undefined,
      fim: data.fim ? new Date(data.fim) : undefined,
    });
    res.status(200).json({ status: 'success', data: { evento } });
  };

  markConcluido = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.svc.markConcluido(req.params['id'] as string, req.user!.sub);
    res.status(200).json({ status: 'success', data: { evento } });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.svc.delete(req.params['id'] as string, req.user!.sub);
    res.status(204).send();
  };
}
