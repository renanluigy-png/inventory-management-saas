import { Request, Response } from 'express';
import { HistoricoService } from '../services/HistoricoService';

export class HistoricoController {
  private svc: HistoricoService;
  constructor() { this.svc = new HistoricoService(); }

  findByEntidade = async (req: Request, res: Response): Promise<void> => {
    const { entidade, id } = req.params as { entidade: string; id: string };
    const history = await this.svc.findByEntidade(entidade, id, req.companyId);
    res.status(200).json({ status: 'success', data: { history } });
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    const result = await this.svc.findAll({
      companyId: req.companyId,
      entidade: req.query['entidade'] as string | undefined,
      page: Number(req.query['page']) || 1,
      limit: Number(req.query['limit']) || 30,
    });
    res.status(200).json({ status: 'success', ...result });
  };
}
