import { Request, Response } from 'express';
import { z } from 'zod';
import { CaixaService } from '../services/CaixaService';

const abrirSchema = z.object({
  saldoInicial: z.number().min(0),
  observacao: z.string().optional(),
});

const fecharSchema = z.object({
  saldoFinal: z.number().min(0),
  observacao: z.string().optional(),
});

const movSchema = z.object({
  valor: z.number().positive(),
  descricao: z.string().optional(),
});

export class CaixaController {
  private caixaService: CaixaService;

  constructor() {
    this.caixaService = new CaixaService();
  }

  getStatus = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.caixaService.getStatus();
    res.status(200).json({ status: 'success', data });
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const result = await this.caixaService.findAll({ page, limit });
    res.status(200).json({ status: 'success', ...result });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const data = await this.caixaService.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data });
  };

  abrir = async (req: Request, res: Response): Promise<void> => {
    const { saldoInicial, observacao } = abrirSchema.parse(req.body);
    const userId = req.user!.sub;
    const caixa = await this.caixaService.abrir(userId, saldoInicial, observacao);
    res.status(201).json({ status: 'success', data: { caixa } });
  };

  fechar = async (req: Request, res: Response): Promise<void> => {
    const { saldoFinal, observacao } = fecharSchema.parse(req.body);
    const caixa = await this.caixaService.fechar(req.params['id'] as string, saldoFinal, observacao);
    res.status(200).json({ status: 'success', data: { caixa } });
  };

  sangria = async (req: Request, res: Response): Promise<void> => {
    const { valor, descricao } = movSchema.parse(req.body);
    const mov = await this.caixaService.sangria(req.params['id'] as string, valor, descricao);
    res.status(201).json({ status: 'success', data: { movimentacao: mov } });
  };

  suprimento = async (req: Request, res: Response): Promise<void> => {
    const { valor, descricao } = movSchema.parse(req.body);
    const mov = await this.caixaService.suprimento(req.params['id'] as string, valor, descricao);
    res.status(201).json({ status: 'success', data: { movimentacao: mov } });
  };
}
