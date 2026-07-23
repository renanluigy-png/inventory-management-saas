import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

function buildErrorResponse(
  status: string,
  message: string,
  req: Request,
  extra?: Record<string, unknown>
) {
  return {
    success: false,
    status,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    ...extra,
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erros operacionais da aplicação (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      buildErrorResponse('error', err.message, req)
    );
    return;
  }

  // Erros de validação de schema (Zod)
  if (err instanceof ZodError) {
    res.status(422).json(
      buildErrorResponse(
        'validation_error',
        'Dados inválidos. Verifique os campos e tente novamente.',
        req,
        { errors: err.flatten().fieldErrors }
      )
    );
    return;
  }

  // Erros de upload de arquivo (Multer)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(
        buildErrorResponse('error', 'Arquivo muito grande. O tamanho máximo permitido é 5 MB.', req)
      );
      return;
    }
    res.status(400).json(
      buildErrorResponse('error', `Erro no upload do arquivo: ${err.message}`, req)
    );
    return;
  }

  // Erros conhecidos do Prisma (banco de dados)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ') ?? 'campo';
      res.status(409).json(
        buildErrorResponse('error', `Já existe um registro com este ${fields}.`, req)
      );
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json(
        buildErrorResponse('error', 'Registro não encontrado.', req)
      );
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json(
        buildErrorResponse('error', 'Referência inválida: o registro relacionado não existe.', req)
      );
      return;
    }
  }

  // Erros inesperados — logar e retornar 500
  logger.error('Erro não tratado', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json(
    buildErrorResponse(
      'error',
      'Erro interno do servidor.',
      req,
      env.NODE_ENV === 'development'
        ? { debug: { name: err.name, message: err.message } }
        : undefined
    )
  );
}
