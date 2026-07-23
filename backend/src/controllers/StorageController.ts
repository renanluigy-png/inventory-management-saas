import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { StorageService } from '../integrations/storage/StorageService';
import { AppError } from '../utils/AppError';

const storageService = new StorageService();

export const StorageController = {
  provider: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: 'success', data: { provider: storageService.getProviderName() } });
  }),

  uploadImagem: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Arquivo de imagem é obrigatório.', 400);

    const { entidade, entidadeId, campo } = z.object({
      entidade:   z.string().optional(),
      entidadeId: z.string().optional(),
      campo:      z.string().optional(),
    }).parse(req.body);

    const user = (req as Request & { user?: { sub: string } }).user;

    const result = await storageService.uploadImagem(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      { entidade, entidadeId, campo, userId: user?.sub }
    );

    res.status(201).json({ status: 'success', data: result });
  }),

  uploadDocumento: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Arquivo é obrigatório.', 400);

    const { entidade, entidadeId, campo } = z.object({
      entidade:   z.string().optional(),
      entidadeId: z.string().optional(),
      campo:      z.string().optional(),
    }).parse(req.body);

    const user = (req as Request & { user?: { sub: string } }).user;

    const result = await storageService.uploadDocumento(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      { entidade, entidadeId, campo, userId: user?.sub }
    );

    res.status(201).json({ status: 'success', data: result });
  }),

  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { entidade, entidadeId } = z.object({
      entidade:   z.string().optional(),
      entidadeId: z.string().optional(),
    }).parse(req.query);

    const result = await storageService.findAll({ entidade, entidadeId });
    res.json({ status: 'success', data: result });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params['id'] as string;
    await storageService.delete(id);
    res.status(204).send();
  }),
};
