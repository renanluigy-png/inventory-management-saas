import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mocka o banco ANTES de importar o app (ordem importa)
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

import app from '../../app';
import { prisma } from '../../config/database';

const JWT_SECRET = 'test-secret-for-jest-that-is-at-least-32-chars';

describe('Auth Routes', () => {
  const rawPassword = 'senha123';
  let hashedPassword: string;

  const mockUser = {
    id: 'user-1',
    nome: 'Admin Teste',
    email: 'admin@empresa.com',
    role: 'ADMIN',
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(rawPassword, 10);
  });

  beforeEach(() => {
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  describe('POST /api/v1/auth/login', () => {
    it('deve retornar 200 com accessToken para credenciais válidas', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        senha: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@empresa.com', senha: rawPassword });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@empresa.com');
      expect(res.body.data.user).not.toHaveProperty('senha');
    });

    it('deve retornar 401 para senha incorreta', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        senha: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@empresa.com', senha: 'senhaerrada' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('deve retornar 401 para usuário não encontrado', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'naoexiste@empresa.com', senha: rawPassword });

      expect(res.status).toBe(401);
    });

    it('deve retornar 422 para e-mail com formato inválido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'emailinvalido', senha: 'senha123' });

      expect(res.status).toBe(422);
    });

    it('deve retornar 422 quando body está vazio', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(422);
    });

    it('deve retornar 403 para usuário inativo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        ativo: false,
        senha: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@empresa.com', senha: rawPassword });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    const validToken = jwt.sign(
      { sub: 'user-1', email: 'admin@empresa.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: 28800 }
    );

    it('deve retornar 200 com perfil do usuário autenticado', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('admin@empresa.com');
    });

    it('deve retornar 401 sem header de autorização', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('deve retornar 401 com token inválido', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer token.invalido.aqui');

      expect(res.status).toBe(401);
    });
  });
});
