import { Request, Response } from 'express';
import { MonitorService } from '../services/MonitorService';

export class MonitorController {
  private svc: MonitorService;
  constructor() { this.svc = new MonitorService(); }

  getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.svc.getPlatformStats();
    res.status(200).json({ status: 'success', data: stats });
  };

  getServerStats = (_req: Request, res: Response): void => {
    const stats = this.svc.getServerStats();
    res.status(200).json({ status: 'success', data: stats });
  };

  getOnlineUsers = (_req: Request, res: Response): void => {
    const users = this.svc.getOnlineUsers();
    res.status(200).json({ status: 'success', data: { users, count: users.length } });
  };

  getAPIStatus = async (_req: Request, res: Response): Promise<void> => {
    const status = await this.svc.getAPIStatus();
    res.status(200).json({ status: 'success', data: status });
  };
}
