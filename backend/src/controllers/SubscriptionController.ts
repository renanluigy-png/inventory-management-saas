import { Request, Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';

export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  // GET /subscriptions/me
  getMySubscription = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.subscriptionService.findByCompanyId(req.companyId!);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  // PATCH /subscriptions/me/cancel
  cancelMine = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.subscriptionService.cancel(req.companyId!);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  // GET /subscriptions/me/revenue (MASTER)
  getRevenue = async (_req: Request, res: Response): Promise<void> => {
    const revenue = await this.subscriptionService.getRevenueStats();
    res.status(200).json({ status: 'success', data: { revenue } });
  };

  // POST /subscriptions/:companyId/activate (MASTER)
  activate = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.subscriptionService.activate(req.params['companyId'] as string);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  // POST /subscriptions/:companyId/suspend (MASTER)
  suspend = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.subscriptionService.suspend(req.params['companyId'] as string);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  // POST /subscriptions/:companyId/renew (MASTER)
  renew = async (req: Request, res: Response): Promise<void> => {
    const subscription = await this.subscriptionService.renew(req.params['companyId'] as string);
    res.status(200).json({ status: 'success', data: { subscription } });
  };

  // POST /subscriptions/process-expired (MASTER — chamado por scheduler)
  processExpired = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.subscriptionService.processExpiredTrials();
    res.status(200).json({ status: 'success', data: result });
  };
}
