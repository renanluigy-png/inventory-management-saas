import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { PixService } from '../integrations/payment/PixService';
import { env } from '../config/env';

const pixService = new PixService();

const createSchema = z.object({
  saleId: z.string().uuid().optional(),
  valor: z.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  expiresInMinutes: z.number().int().positive().default(30),
  pagador: z.object({
    nome: z.string().optional(),
    cpf: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

export const PixController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = createSchema.parse(req.body);
    const result = await pixService.createPayment(data);
    res.status(201).json({ status: 'success', data: result });
  }),

  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const result = await pixService.getStatus(id);
    res.json({ status: 'success', data: result });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const result = await pixService.cancel(id);
    res.json({ status: 'success', data: result });
  }),

  webhook: asyncHandler(async (req: Request, res: Response) => {
    const provider = req.query['provider'] as string | undefined ?? env.PIX_PROVIDER;
    await pixService.handleWebhook(
      req.headers as Record<string, string>,
      req.body,
      provider
    );
    // Sempre retorna 200 para o provedor (não retentar)
    res.status(200).json({ received: true });
  }),

  listBySale: asyncHandler(async (req: Request, res: Response) => {
    const saleId = req.params['saleId'] as string;
    const result = await pixService.listBySale(saleId);
    res.json({ status: 'success', data: result });
  }),

  findAll: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      status: z.enum(['PENDENTE', 'PAGO', 'CANCELADO', 'EXPIRADO']).optional(),
      page:   z.coerce.number().positive().default(1),
      limit:  z.coerce.number().positive().max(100).default(20),
    });
    const params = schema.parse(req.query);
    const result = await pixService.findAll(params);
    res.json({ status: 'success', ...result });
  }),
};
