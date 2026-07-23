import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { FiscalService } from '../integrations/fiscal/FiscalService';

const fiscalService = new FiscalService();

const itemSchema = z.object({
  codigo: z.string(),
  descricao: z.string(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  quantidade: z.number().positive(),
  unidade: z.string().default('UN'),
  valorUnitario: z.number().positive(),
  valorTotal: z.number().positive(),
  aliquotaICMS: z.number().optional(),
});

const emissaoSchema = z.object({
  tipo: z.enum(['NFCE', 'NFE', 'SAT', 'CUPOM']),
  saleId: z.string().uuid().optional(),
  emitente: z.object({
    cnpj: z.string(),
    nomeEmpresa: z.string(),
    ie: z.string().optional(),
    endereco: z.string(),
  }),
  destinatario: z.object({
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    nome: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  itens: z.array(itemSchema).min(1),
  pagamento: z.object({
    formaPagamento: z.string(),
    valor: z.number().positive(),
    troco: z.number().optional(),
  }),
  desconto: z.number().optional(),
  totalBruto: z.number().positive(),
  totalLiquido: z.number().positive(),
});

export const FiscalController = {
  providers: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: 'success', data: fiscalService.getProviders() });
  }),

  emitir: asyncHandler(async (req: Request, res: Response) => {
    const data = emissaoSchema.parse(req.body);
    const result = await fiscalService.emitir(data);
    res.status(201).json({ status: 'success', data: result });
  }),

  cancelar: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const { motivo } = z.object({ motivo: z.string().min(15).max(255) }).parse(req.body);
    const result = await fiscalService.cancelar(id, motivo);
    res.json({ status: 'success', data: result });
  }),

  consultar: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    const result = await fiscalService.consultar(id);
    res.json({ status: 'success', data: result });
  }),

  listBySale: asyncHandler(async (req: Request, res: Response) => {
    const saleId = req.params['saleId'] as string;
    const result = await fiscalService.findBySale(saleId);
    res.json({ status: 'success', data: result });
  }),

  findAll: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      tipo:   z.enum(['NFCE', 'NFE', 'SAT', 'CUPOM']).optional(),
      status: z.string().optional(),
      page:   z.coerce.number().positive().default(1),
      limit:  z.coerce.number().positive().max(100).default(20),
    });
    const result = await fiscalService.findAll(schema.parse(req.query));
    res.json({ status: 'success', ...result });
  }),
};
