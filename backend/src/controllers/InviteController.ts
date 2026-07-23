import { Request, Response } from 'express';
import { z } from 'zod';
import { InviteService } from '../services/InviteService';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'GERENTE', 'FUNCIONARIO', 'CAIXA']).optional().default('FUNCIONARIO'),
});

const acceptSchema = z.object({
  token: z.string().min(1),
  nome: z.string().min(2),
  senha: z.string().min(6),
});

export class InviteController {
  private inviteService: InviteService;

  constructor() {
    this.inviteService = new InviteService();
  }

  // POST /invites
  send = async (req: Request, res: Response): Promise<void> => {
    const { email, role } = inviteSchema.parse(req.body);
    const result = await this.inviteService.invite(
      req.companyId!,
      email,
      role,
      req.user!.sub
    );
    res.status(201).json({ status: 'success', data: result });
  };

  // GET /invites
  list = async (req: Request, res: Response): Promise<void> => {
    const invites = await this.inviteService.listByCompany(req.companyId!);
    res.status(200).json({ status: 'success', data: { invites } });
  };

  // DELETE /invites/:id
  revoke = async (req: Request, res: Response): Promise<void> => {
    await this.inviteService.revoke(req.params['id'] as string, req.companyId!);
    res.status(200).json({ status: 'success', message: 'Convite revogado.' });
  };

  // GET /invites/validate?token=...
  validate = async (req: Request, res: Response): Promise<void> => {
    const token = req.query['token'] as string;
    if (!token) {
      res.status(400).json({ status: 'error', message: 'Token não fornecido.' });
      return;
    }
    const invite = await this.inviteService.validateToken(token);
    res.status(200).json({
      status: 'success',
      data: {
        email: invite.email,
        role: invite.role,
        empresa: invite.company?.nome,
        expiresAt: invite.expiresAt,
      },
    });
  };

  // POST /invites/accept
  accept = async (req: Request, res: Response): Promise<void> => {
    const { token, nome, senha } = acceptSchema.parse(req.body);
    const result = await this.inviteService.accept(token, { nome, senha });
    res.status(200).json({ status: 'success', data: result });
  };
}
