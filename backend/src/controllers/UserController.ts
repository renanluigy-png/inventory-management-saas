import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/UserService';

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA']).optional(),
});

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA']).optional(),
  ativo: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  novaSenha: z.string().min(6),
});

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const search = req.query['search'] as string | undefined;
    const role = req.query['role'] as string | undefined;
    const ativo =
      req.query['ativo'] !== undefined ? req.query['ativo'] === 'true' : undefined;

    const result = await this.userService.findAll({ page, limit, search, role, ativo });
    res.status(200).json({ status: 'success', ...result });
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.findById(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { user } });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = createSchema.parse(req.body);
    const user = await this.userService.create(data);
    res.status(201).json({ status: 'success', data: { user } });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = updateSchema.parse(req.body);
    const user = await this.userService.update(req.params['id'] as string, data);
    res.status(200).json({ status: 'success', data: { user } });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { novaSenha } = resetPasswordSchema.parse(req.body);
    await this.userService.resetPasswordByAdmin(
      req.params['id'] as string,
      novaSenha,
      req.user!.sub
    );
    res.status(200).json({ status: 'success', message: 'Senha redefinida com sucesso.' });
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.softDelete(req.params['id'] as string, req.user!.sub);
    res.status(200).json({ status: 'success', data: { user } });
  };

  reactivate = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.reactivate(req.params['id'] as string);
    res.status(200).json({ status: 'success', data: { user } });
  };
}
