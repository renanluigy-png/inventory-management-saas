import { Request, Response } from 'express';
import { z } from 'zod';
import { SaleService } from '../services/SaleService';
import { StatusVenda } from '@prisma/client';

// ----------------------------------------------------------------
// Schemas de validação (Zod)
// ----------------------------------------------------------------

const FORMAS_PAGAMENTO = [
  'DINHEIRO',
  'PIX',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'FIADO',
] as const;

// GET /sales — listagem com filtros
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  numero: z.coerce.number().int().positive().optional(),
  customerId: z.string().uuid('customerId inválido.').optional(),
  userId: z.string().uuid('userId inválido.').optional(),
  status: z.enum(['ABERTA', 'FINALIZADA', 'CANCELADA']).optional(),
  productId: z.string().uuid('productId inválido.').optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  orderBy: z.enum(['numero', 'total', 'createdAt']).default('numero'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// POST /sales — abertura de venda
const criarVendaSchema = z.object({
  customerId: z.string().uuid('customerId inválido.').optional(),
  formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
  observacao: z.string().max(1000).trim().optional(),
});

// PATCH /sales/:id — atualização do cabeçalho
const atualizarVendaSchema = z
  .object({
    customerId: z.string().uuid('customerId inválido.').nullable().optional(),
    formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
    desconto: z.number({ invalid_type_error: 'Desconto deve ser um número.' }).min(0).optional(),
    observacao: z.string().max(1000).trim().nullable().optional(),
  })
  .refine(
    (d) =>
      d.customerId !== undefined ||
      d.formaPagamento !== undefined ||
      d.desconto !== undefined ||
      d.observacao !== undefined,
    { message: 'Forneça pelo menos um campo para atualizar.' }
  );

// POST /sales/:id/items — adição de item
const adicionarItemSchema = z
  .object({
    productId: z.string().uuid('productId inválido.').optional(),
    codigoBarras: z.string().max(100).trim().optional(),
    sku: z.string().max(50).trim().toUpperCase().optional(),
    quantidade: z
      .number({ required_error: 'Quantidade é obrigatória.' })
      .int('Quantidade deve ser um número inteiro.')
      .positive('Quantidade deve ser positiva.'),
    desconto: z
      .number({ invalid_type_error: 'Desconto deve ser um número.' })
      .min(0, 'Desconto não pode ser negativo.')
      .default(0),
  })
  .refine(
    (d) => d.productId || d.codigoBarras || d.sku,
    {
      message: 'Forneça pelo menos um identificador do produto: productId, codigoBarras ou sku.',
    }
  );

// PATCH /sales/:id/items/:itemId — atualização de item
const atualizarItemSchema = z
  .object({
    quantidade: z
      .number({ invalid_type_error: 'Quantidade deve ser um número.' })
      .int('Quantidade deve ser um número inteiro.')
      .positive('Quantidade deve ser positiva.')
      .optional(),
    desconto: z
      .number({ invalid_type_error: 'Desconto deve ser um número.' })
      .min(0, 'Desconto não pode ser negativo.')
      .optional(),
  })
  .refine(
    (d) => d.quantidade !== undefined || d.desconto !== undefined,
    { message: 'Forneça pelo menos quantidade ou desconto para atualizar.' }
  );

// POST /sales/:id/finalize — finalização da venda
const finalizarSchema = z.object({
  formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
});

// POST /sales/:id/cancel — cancelamento explícito com observação
const cancelarSchema = z.object({
  observacao: z.string().max(500).trim().optional(),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  // ----------------------------------------------------------------
  // Leitura
  // ----------------------------------------------------------------

  // GET /api/v1/sales
  findAll = async (req: Request, res: Response): Promise<void> => {
    const params = querySchema.parse(req.query);
    const result = await this.saleService.findAll({
      ...params,
      status: params.status as StatusVenda | undefined,
    });

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/sales/:id
  findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const sale = await this.saleService.findById(id);

    res.status(200).json({ status: 'success', data: { sale } });
  };

  // ----------------------------------------------------------------
  // Abertura e atualização
  // ----------------------------------------------------------------

  // POST /api/v1/sales
  criar = async (req: Request, res: Response): Promise<void> => {
    const body = criarVendaSchema.parse(req.body);
    const sale = await this.saleService.criarVenda({
      ...body,
      userId: req.user!.sub,
    });

    res.status(201).json({
      status: 'success',
      message: `Venda #${sale.numero} aberta com sucesso.`,
      data: { sale },
    });
  };

  // PATCH /api/v1/sales/:id
  atualizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = atualizarVendaSchema.parse(req.body);
    const sale = await this.saleService.atualizarVenda(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Venda atualizada com sucesso.',
      data: { sale },
    });
  };

  // ----------------------------------------------------------------
  // Itens
  // ----------------------------------------------------------------

  // POST /api/v1/sales/:id/items
  adicionarItem = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = adicionarItemSchema.parse(req.body);
    const sale = await this.saleService.adicionarItem(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Item adicionado à venda.',
      data: { sale },
    });
  };

  // PATCH /api/v1/sales/:id/items/:itemId
  atualizarItem = async (req: Request, res: Response): Promise<void> => {
    const { id, itemId } = req.params as { id: string; itemId: string };
    const body = atualizarItemSchema.parse(req.body);
    const sale = await this.saleService.atualizarItem(id, itemId, body);

    res.status(200).json({
      status: 'success',
      message: 'Item atualizado.',
      data: { sale },
    });
  };

  // DELETE /api/v1/sales/:id/items/:itemId
  removerItem = async (req: Request, res: Response): Promise<void> => {
    const { id, itemId } = req.params as { id: string; itemId: string };
    const sale = await this.saleService.removerItem(id, itemId);

    res.status(200).json({
      status: 'success',
      message: 'Item removido da venda.',
      data: { sale },
    });
  };

  // ----------------------------------------------------------------
  // Finalização
  // ----------------------------------------------------------------

  // POST /api/v1/sales/:id/finalize
  finalizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = finalizarSchema.parse(req.body);
    const sale = await this.saleService.finalizar(id, req.user!.sub, {
      formaPagamento: body.formaPagamento,
      ip: this.getClientIP(req),
    });

    res.status(200).json({
      status: 'success',
      message: `Venda #${sale.numero} finalizada com sucesso.`,
      data: { sale },
    });
  };

  // ----------------------------------------------------------------
  // Cancelamento
  // ----------------------------------------------------------------

  // DELETE /api/v1/sales/:id  (alias de cancelamento)
  cancelar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    await this.saleService.cancelar(id);

    res.status(204).send();
  };

  // POST /api/v1/sales/:id/cancel  (com observação opcional)
  cancelarComObservacao = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const { observacao } = cancelarSchema.parse(req.body);
    const sale = await this.saleService.cancelar(id, observacao);

    res.status(200).json({
      status: 'success',
      message: `Venda #${sale.numero} cancelada.`,
      data: { sale },
    });
  };

  // ----------------------------------------------------------------
  // Helper privado
  // ----------------------------------------------------------------

  private getClientIP(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const addr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return addr.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
