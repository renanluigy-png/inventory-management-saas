import { Request, Response, NextFunction } from 'express';
import { TechLogService } from '../services/TechLogService';

const techLogSvc = new TechLogService();

export function techLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duracao = Date.now() - startTime;
    const { statusCode } = res;

    // Only log errors and slow requests to avoid DB spam
    if (statusCode >= 400 || duracao >= 500) {
      techLogSvc
        .logRequest({
          path: req.path,
          metodo: req.method,
          statusCode,
          duracao,
          usuarioId: req.user?.sub,
          companyId: req.companyId,
          ip: req.ip ?? req.socket?.remoteAddress,
        })
        .catch(() => undefined);
    }
  });

  next();
}
