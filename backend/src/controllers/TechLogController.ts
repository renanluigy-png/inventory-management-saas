import { Request, Response } from 'express';
import { z } from 'zod';
import { TechLogService } from '../services/TechLogService';
import { LogNivel } from '@prisma/client';

export class TechLogController {
  private svc: TechLogService;
  constructor() { this.svc = new TechLogService(); }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const result = await this.svc.findAll({
      companyId: req.companyId,
      nivel: req.query['nivel'] as LogNivel | undefined,
      categoria: req.query['categoria'] as string | undefined,
      page: Number(req.query['page']) || 1,
      limit: Number(req.query['limit']) || 50,
      desde: req.query['desde'] as string | undefined,
      ate: req.query['ate'] as string | undefined,
    });
    res.status(200).json({ status: 'success', ...result });
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.svc.getSummary(req.companyId);
    res.status(200).json({ status: 'success', data: summary });
  };

  cleanup = async (req: Request, res: Response): Promise<void> => {
    const days = Number(req.query['days']) || 30;
    const deleted = await this.svc.cleanup(days);
    res.status(200).json({ status: 'success', data: { deleted } });
  };
}
