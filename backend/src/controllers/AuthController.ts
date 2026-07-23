import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';
import { AuditService } from '../services/AuditService';
import { AuditAction } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
});

const forgotSchema = z.object({
  email: z.string().email('E-mail inválido.'),
});

const resetSchema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres.'),
});

const changePasswordSchema = z.object({
  senhaAtual: z.string().min(6),
  novaSenha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres.'),
});

const registerCompanySchema = z.object({
  nomeEmpresa: z.string().min(2, 'Nome da empresa é obrigatório.'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  telefoneEmpresa: z.string().optional(),
  nomeAdmin: z.string().min(2, 'Nome do responsável é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  confirmarSenha: z.string().min(6),
  cidade: z.string().optional(),
  estado: z.string().optional(),
}).refine((d) => d.senha === d.confirmarSenha, {
  message: 'As senhas não coincidem.',
  path: ['confirmarSenha'],
});

function getIP(req: Request): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) {
    const addr = Array.isArray(fwd) ? fwd[0] : fwd;
    return addr.split(',')[0].trim();
  }
  return req.ip ?? undefined;
}

export class AuthController {
  private authService: AuthService;
  private auditService: AuditService;

  constructor() {
    this.authService = new AuthService();
    this.auditService = new AuditService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const credentials = loginSchema.parse(req.body);
    const meta = { ip: getIP(req), userAgent: req.headers['user-agent'] };
    const result = await this.authService.login(credentials, meta);

    this.auditService
      .log({
        usuarioId: result.user.id,
        entidade: 'auth',
        entidadeId: result.user.id,
        acao: AuditAction.LOGIN,
        dadosDepois: { email: result.user.email, ip: meta.ip },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      .catch(() => {});

    res.status(200).json({ status: 'success', data: result });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = z
      .object({ refreshToken: z.string().min(1) })
      .parse(req.body);

    const meta = { ip: getIP(req), userAgent: req.headers['user-agent'] };
    const result = await this.authService.refreshTokens(refreshToken, meta);

    res.status(200).json({ status: 'success', data: result });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = z
      .object({ refreshToken: z.string().optional() })
      .parse(req.body);

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.auditService
      .log({
        usuarioId: req.user?.sub,
        entidade: 'auth',
        entidadeId: req.user?.sub,
        acao: AuditAction.LOGOUT,
        ip: getIP(req),
        userAgent: req.headers['user-agent'],
      })
      .catch(() => {});

    res.status(200).json({ status: 'success', message: 'Logout realizado.' });
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    await this.authService.logoutAll(userId);
    res.status(200).json({ status: 'success', message: 'Sessões encerradas em todos os dispositivos.' });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = forgotSchema.parse(req.body);
    await this.authService.forgotPassword(email);
    // Sempre retorna 200 para não revelar se o e-mail existe
    res.status(200).json({
      status: 'success',
      message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.',
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, novaSenha } = resetSchema.parse(req.body);
    await this.authService.resetPassword(token, novaSenha);
    res.status(200).json({ status: 'success', message: 'Senha redefinida com sucesso.' });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { senhaAtual, novaSenha } = changePasswordSchema.parse(req.body);
    await this.authService.changePassword(userId, senhaAtual, novaSenha);
    res.status(200).json({ status: 'success', message: 'Senha alterada com sucesso.' });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const user = await this.authService.getProfile(userId);
    res.status(200).json({ status: 'success', data: { user } });
  };

  registerCompany = async (req: Request, res: Response): Promise<void> => {
    const data = registerCompanySchema.parse(req.body);
    const meta = { ip: getIP(req), userAgent: req.headers['user-agent'] };
    const result = await this.authService.registerCompany(data, meta);
    res.status(201).json({ status: 'success', data: result });
  };
}
