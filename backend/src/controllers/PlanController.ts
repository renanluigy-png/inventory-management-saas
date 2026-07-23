import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';

export class PlanController {
  private planService: PlanService;

  constructor() {
    this.planService = new PlanService();
  }

  findAll = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.planService.findAll();
    res.status(200).json({ status: 'success', data: { plans } });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const plan = await this.planService.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { plan } });
  };

  seedDefaults = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.planService.seedDefaultPlans();
    res.status(200).json({ status: 'success', message: 'Planos padrão criados/atualizados.', data: { plans } });
  };

  getMyLimits = async (req: Request, res: Response): Promise<void> => {
    const limits = await this.planService.getLimitsForCompany(req.companyId!);
    res.status(200).json({ status: 'success', data: { limits } });
  };
}
