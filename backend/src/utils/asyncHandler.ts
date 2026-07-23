import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wrapper para route handlers assíncronos.
 * Captura rejeições de Promise e repassa para o error handler do Express.
 * Express 5 já faz isso nativamente, mas mantemos por compatibilidade.
 */
export const asyncHandler = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
