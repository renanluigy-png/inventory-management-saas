import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../services/AuditService';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Mapeamento: segment de URL → nome da entidade auditada
function resolverEntidade(url: string): string {
  const segments = url.replace(/^\/api\/v1\//, '').split('/');
  return segments[0] ?? 'unknown';
}

function resolverAcao(method: string, statusCode: number): AuditAction | null {
  if (statusCode < 200 || statusCode >= 300) return null; // só audita sucesso
  switch (method) {
    case 'POST':   return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH':  return AuditAction.UPDATE;
    case 'DELETE': return AuditAction.DELETE;
    default:       return null;
  }
}

function getIP(req: Request): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) {
    const addr = Array.isArray(fwd) ? fwd[0] : fwd;
    return addr.split(',')[0].trim();
  }
  return req.ip ?? undefined;
}

/**
 * Middleware de auditoria automática:
 * registra todas as operações de escrita bem-sucedidas no AuditLog.
 * O registro é fire-and-forget para não bloquear a resposta.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    const acao = resolverAcao(req.method, res.statusCode);
    if (!acao) return;

    const user = (req as Request & { user?: { sub: string } }).user;
    const entidadeId = (req.params as Record<string, string>).id;

    new AuditService()
      .log({
        usuarioId: user?.sub,
        entidade: resolverEntidade(req.originalUrl),
        entidadeId,
        acao,
        ip: getIP(req),
        userAgent: req.headers['user-agent'],
      })
      .catch(() => {}); // absorve erros — auditoria nunca pode travar a API
  });

  next();
}
