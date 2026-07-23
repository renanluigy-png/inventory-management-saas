import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const apenasNaoLidas = req.query['naoLidas'] === 'true';

    const result = await this.notificationService.findByUser(userId, {
      page,
      limit,
      apenasNaoLidas,
    });
    res.status(200).json({ status: 'success', ...result });
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const notif = await this.notificationService.markAsRead(req.params['id'] as string, userId);
    res.status(200).json({ status: 'success', data: { notification: notif } });
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    await this.notificationService.markAllAsRead(userId);
    res.status(200).json({ status: 'success', message: 'Todas as notificações marcadas como lidas.' });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    await this.notificationService.delete(req.params['id'] as string, userId);
    res.status(204).send();
  };

  checkAlerts = async (_req: Request, res: Response): Promise<void> => {
    await this.notificationService.checkAndCreateAlerts();
    res.status(200).json({ status: 'success', message: 'Alertas verificados.' });
  };
}
