import { Request, Response } from 'express';
import { z } from 'zod';
import { AuditService } from '../services/AuditService';
import { AuditAction } from '@prisma/client';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  usuarioId: z.string().uuid().optional(),
  entidade: z.string().trim().optional(),
  acao: z.nativeEnum(AuditAction).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export class AuditController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /** GET /api/v1/audit — lista eventos de auditoria paginados com filtros. */
  findAll = async (req: Request, res: Response): Promise<void> => {
    const params = querySchema.parse(req.query);
    const result = await this.auditService.findAll(params);
    res.status(200).json({ status: 'success', ...result });
  };
}
