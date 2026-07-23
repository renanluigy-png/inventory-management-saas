import { Request, Response, NextFunction } from 'express';
import { appCache } from '../utils/cache';

/**
 * Factory que retorna um middleware de cache em memória para GETs.
 * A chave de cache é a URL completa da requisição (path + query string).
 *
 * @param ttl Tempo de vida em segundos (padrão: 300s = 5 min)
 */
export function cacheMiddleware(ttl?: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Apenas GET; ignora rotas de usuários autenticados que variam por token
    if (req.method !== 'GET') return next();

    const key = `cache:${req.originalUrl}`;
    const cached = appCache.get<object>(key);

    if (cached !== undefined) {
      res.status(200).json(cached);
      return;
    }

    // Intercepta res.json para capturar e armazenar a resposta
    const originalJson = res.json.bind(res) as (body: unknown) => Response;
    res.json = (body: unknown): Response => {
      if (res.statusCode === 200) {
        appCache.set(key, body, ttl ?? 300);
      }
      return originalJson(body);
    };

    next();
  };
}
