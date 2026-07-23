import { Request, Response } from 'express';
import { z } from 'zod';
import { SettingsService } from '../services/SettingsService';

const updateSettingsSchema = z.object({
  nomeEmpresa: z.string().min(2).max(200).trim().optional(),
  cnpj: z.string().max(18).trim().nullable().optional(),
  telefone: z.string().max(20).trim().nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  endereco: z.string().max(500).trim().nullable().optional(),
  logoUrl: z.string().url().max(1000).nullable().optional(),
  tema: z.enum(['light', 'dark']).optional(),
  moeda: z.string().length(3).toUpperCase().optional(),
  impostoPercent: z
    .number()
    .min(0)
    .max(100, 'Imposto não pode ultrapassar 100%.')
    .optional(),
  estoqueMinimoPadrao: z.number().int().min(0).optional(),
  permitirVendaSemEstoque: z.boolean().optional(),
});

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  /** GET /api/v1/settings — retorna as configurações atuais do sistema. */
  get = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.settingsService.get();
    res.status(200).json({ status: 'success', data: { settings } });
  };

  /** PUT /api/v1/settings — atualiza as configurações do sistema (ADMIN). */
  update = async (req: Request, res: Response): Promise<void> => {
    const dto = updateSettingsSchema.parse(req.body);
    const settings = await this.settingsService.update(dto);
    res.status(200).json({
      status: 'success',
      message: 'Configurações atualizadas com sucesso.',
      data: { settings },
    });
  };
}
