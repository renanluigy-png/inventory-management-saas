import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/MetricsService';

/**
 * Loga cada requisição concluída e registra a duração nas métricas.
 * Deve ser adicionado antes das rotas no server.ts.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl} → ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as Request & { user?: { sub: string } }).user?.sub ?? 'anon',
      ip: req.ip,
    });

    // Registra métricas no singleton
    MetricsService.getInstance().record({
      method: req.method,
      route: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
