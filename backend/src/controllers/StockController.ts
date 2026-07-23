import { Request, Response } from 'express';
import { z } from 'zod';
import { StockService } from '../services/StockService';

// ----------------------------------------------------------------
// Schemas de validação (Zod)
// ----------------------------------------------------------------

// GET /stock — visão geral do estoque por produto
const estoqueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  orderBy: z.enum(['nome', 'estoque', 'createdAt']).default('nome'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// GET /stock/history — histórico de movimentações com todos os filtros
const historicoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  productId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  tipo: z
    .enum([
      'ENTRADA',
      'SAIDA',
      'AJUSTE',
      'VENDA',
      'DEVOLUCAO',
      'BAIXA_PERDA',
      'BAIXA_AVARIA',
      'TRANSFERENCIA',
    ])
    .optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  orderBy: z.enum(['createdAt', 'tipo', 'quantidade']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// POST /stock/entry
const entradaSchema = z.object({
  productId: z
    .string({ required_error: 'productId é obrigatório.' })
    .uuid('ID do produto inválido.'),
  quantidade: z
    .number({ required_error: 'Quantidade é obrigatória.' })
    .int('Quantidade deve ser um número inteiro.')
    .positive('Quantidade deve ser positiva.'),
  motivo: z.string().max(500).trim().optional(),
});

// POST /stock/output
const saidaSchema = z.object({
  productId: z
    .string({ required_error: 'productId é obrigatório.' })
    .uuid('ID do produto inválido.'),
  quantidade: z
    .number({ required_error: 'Quantidade é obrigatória.' })
    .int('Quantidade deve ser um número inteiro.')
    .positive('Quantidade deve ser positiva.'),
  motivo: z.string().max(500).trim().optional(),
});

// POST /stock/adjust
const ajusteSchema = z.object({
  productId: z
    .string({ required_error: 'productId é obrigatório.' })
    .uuid('ID do produto inválido.'),
  novoEstoque: z
    .number({ required_error: 'novoEstoque é obrigatório.' })
    .int('Deve ser um número inteiro.')
    .min(0, 'Estoque não pode ser negativo.'),
  motivo: z.string().max(500).trim().optional(),
});

// POST /stock/loss — baixa por perda ou avaria (motivo obrigatório)
const baixaSchema = z.object({
  productId: z
    .string({ required_error: 'productId é obrigatório.' })
    .uuid('ID do produto inválido.'),
  tipo: z.enum(['BAIXA_PERDA', 'BAIXA_AVARIA'], {
    required_error: 'Tipo de baixa é obrigatório.',
    invalid_type_error: 'Tipo deve ser BAIXA_PERDA ou BAIXA_AVARIA.',
  }),
  quantidade: z
    .number({ required_error: 'Quantidade é obrigatória.' })
    .int('Quantidade deve ser um número inteiro.')
    .positive('Quantidade deve ser positiva.'),
  motivo: z
    .string({ required_error: 'Motivo é obrigatório para registrar uma baixa.' })
    .min(3, 'Motivo deve ter no mínimo 3 caracteres.')
    .max(500)
    .trim(),
});

// POST /stock/return
const devolucaoSchema = z.object({
  productId: z
    .string({ required_error: 'productId é obrigatório.' })
    .uuid('ID do produto inválido.'),
  quantidade: z
    .number({ required_error: 'Quantidade é obrigatória.' })
    .int('Quantidade deve ser um número inteiro.')
    .positive('Quantidade deve ser positiva.'),
  motivo: z.string().max(500).trim().optional(),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class StockController {
  private stockService: StockService;

  constructor() {
    this.stockService = new StockService();
  }

  // ----------------------------------------------------------------
  // Leitura
  // ----------------------------------------------------------------

  // GET /api/v1/stock
  listarEstoque = async (req: Request, res: Response): Promise<void> => {
    const params = estoqueQuerySchema.parse(req.query);
    const result = await this.stockService.listarEstoque(params);

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/stock/history
  listarHistorico = async (req: Request, res: Response): Promise<void> => {
    const params = historicoQuerySchema.parse(req.query);
    const result = await this.stockService.listarHistorico(params);

    res.status(200).json({ status: 'success', ...result });
  };

  // GET /api/v1/stock/alerts
  listarAlertas = async (req: Request, res: Response): Promise<void> => {
    const alertas = await this.stockService.getAlertas();

    res.status(200).json({ status: 'success', data: alertas });
  };

  // ----------------------------------------------------------------
  // Escritas
  // ----------------------------------------------------------------

  // POST /api/v1/stock/entry
  registrarEntrada = async (req: Request, res: Response): Promise<void> => {
    const body = entradaSchema.parse(req.body);
    const result = await this.stockService.registrarEntrada({
      ...body,
      userId: req.user!.sub,
      ip: this.getClientIP(req),
    });

    res.status(201).json({
      status: 'success',
      message: `Entrada de ${result.movimentacao.quantidade} ${result.produto.unidade} registrada com sucesso.`,
      data: result,
    });
  };

  // POST /api/v1/stock/output
  registrarSaida = async (req: Request, res: Response): Promise<void> => {
    const body = saidaSchema.parse(req.body);
    const result = await this.stockService.registrarSaida({
      ...body,
      userId: req.user!.sub,
      ip: this.getClientIP(req),
    });

    res.status(201).json({
      status: 'success',
      message: `Saída de ${result.movimentacao.quantidade} ${result.produto.unidade} registrada com sucesso.`,
      data: result,
    });
  };

  // POST /api/v1/stock/adjust
  ajustarEstoque = async (req: Request, res: Response): Promise<void> => {
    const body = ajusteSchema.parse(req.body);
    const result = await this.stockService.ajustarEstoque({
      ...body,
      userId: req.user!.sub,
      ip: this.getClientIP(req),
    });

    res.status(200).json({
      status: 'success',
      message: `Estoque ajustado: ${result.estoqueAnterior} → ${result.estoqueAtual} ${result.produto.unidade}.`,
      data: result,
    });
  };

  // POST /api/v1/stock/loss
  registrarBaixa = async (req: Request, res: Response): Promise<void> => {
    const body = baixaSchema.parse(req.body);
    const result = await this.stockService.registrarBaixa({
      ...body,
      userId: req.user!.sub,
      ip: this.getClientIP(req),
    });

    const tipoLabel = body.tipo === 'BAIXA_PERDA' ? 'Baixa por perda' : 'Baixa por avaria';

    res.status(201).json({
      status: 'success',
      message: `${tipoLabel} de ${result.movimentacao.quantidade} ${result.produto.unidade} registrada.`,
      data: result,
    });
  };

  // POST /api/v1/stock/return
  registrarDevolucao = async (req: Request, res: Response): Promise<void> => {
    const body = devolucaoSchema.parse(req.body);
    const result = await this.stockService.registrarDevolucao({
      ...body,
      userId: req.user!.sub,
      ip: this.getClientIP(req),
    });

    res.status(201).json({
      status: 'success',
      message: `Devolução de ${result.movimentacao.quantidade} ${result.produto.unidade} registrada com sucesso.`,
      data: result,
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
