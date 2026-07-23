import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { JwtPayload } from '../types/auth.types';

/**
 * Verifica se o token JWT é válido e injeta os dados do usuário em req.user.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação não fornecido.', 401));
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError('Token inválido ou expirado. Faça login novamente.', 401));
  }
}

/**
 * Garante que o usuário autenticado possui um dos roles permitidos.
 * Deve ser usado após o middleware `authenticate`.
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Não autenticado.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Acesso negado. Roles permitidos: ${roles.join(', ')}.`,
          403
        )
      );
    }

    next();
  };
}
