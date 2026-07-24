import { AuthService } from '../../../services/AuthService';
import { UserRepository } from '../../../repositories/UserRepository';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../../repositories/UserRepository');
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(), verify: jest.fn() }));
jest.mock('../../../config/database', () => ({
  prisma: {
    user: { update: jest.fn() },
    refreshToken: { create: jest.fn() },
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    nome: 'Admin',
    email: 'admin@empresa.com',
    senha: '$2b$10$hashedpassword',
    role: 'ADMIN' as const,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new AuthService();
  });

  describe('login', () => {
    it('deve retornar accessToken e dados do usuário com credenciais válidas', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock.jwt.token');

      const result = await service.login({ email: 'admin@empresa.com', senha: 'senha123' });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe('admin@empresa.com');
      expect(result.user).not.toHaveProperty('senha');
    });

    it('deve lançar AppError 401 quando usuário não existe', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@empresa.com', senha: 'senha123' })
      ).rejects.toMatchObject({ statusCode: 401, isOperational: true });
    });

    it('deve lançar AppError 403 quando usuário está inativo', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        ativo: false,
      });

      await expect(
        service.login({ email: 'admin@empresa.com', senha: 'senha123' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('deve lançar AppError 401 quando senha está errada', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@empresa.com', senha: 'senhaerrada' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('deve chamar bcrypt.compare com a senha e o hash corretos', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await service.login({ email: 'admin@empresa.com', senha: 'senha123' });

      expect(bcrypt.compare).toHaveBeenCalledWith('senha123', mockUser.senha);
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do usuário quando existe', async () => {
      const profile = {
        id: 'user-1',
        nome: 'Admin',
        email: 'admin@empresa.com',
        role: 'ADMIN' as const,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue(profile);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('admin@empresa.com');
    });

    it('deve lançar AppError 404 quando usuário não existe', async () => {
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('naoexiste')).rejects.toMatchObject({
        statusCode: 404,
        isOperational: true,
      });
    });

    it('deve lançar instância de AppError', async () => {
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('naoexiste')).rejects.toBeInstanceOf(AppError);
    });
  });
});
