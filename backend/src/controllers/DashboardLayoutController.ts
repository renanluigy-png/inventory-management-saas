import { Request, Response } from 'express';
import { z } from 'zod';
import { DashboardLayoutService } from '../services/DashboardLayoutService';

const widgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  visible: z.boolean(),
  config: z.record(z.unknown()).optional(),
});

export class DashboardLayoutController {
  private svc: DashboardLayoutService;
  constructor() { this.svc = new DashboardLayoutService(); }

  getLayout = async (req: Request, res: Response): Promise<void> => {
    const layout = await this.svc.getLayout(req.user!.sub, req.companyId);
    res.status(200).json({ status: 'success', data: { layout } });
  };

  saveLayout = async (req: Request, res: Response): Promise<void> => {
    const { widgets } = z.object({ widgets: z.array(widgetSchema) }).parse(req.body);
    const layout = await this.svc.saveLayout(req.user!.sub, widgets, req.companyId);
    res.status(200).json({ status: 'success', data: { layout } });
  };

  resetLayout = async (req: Request, res: Response): Promise<void> => {
    const layout = await this.svc.resetLayout(req.user!.sub);
    res.status(200).json({ status: 'success', data: { layout } });
  };

  getDefaults = (_req: Request, res: Response): void => {
    const widgets = this.svc.getDefaultWidgets();
    res.status(200).json({ status: 'success', data: { widgets } });
  };
}
