import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mocka o banco ANTES de importar o app
jest.mock('../../config/database', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import app from '../../app';
import { prisma } from '../../config/database';

const JWT_SECRET = 'test-secret-for-jest-that-is-at-least-32-chars';

const makeToken = (role = 'ADMIN') =>
  jwt.sign({ sub: 'user-1', email: 'admin@empresa.com', role }, JWT_SECRET, {
    expiresIn: 28800,
  });

describe('Products Routes', () => {
  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU001',
    nome: 'Produto Teste',
    descricao: null,
    preco: 10.0,
    precoCusto: 5.0,
    estoque: 100,
    estoqueMinimo: 5,
    codigoBarras: null,
    unidade: 'UN',
    imagemUrl: null,
    ativo: true,
    categoryId: null,
    category: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  describe('GET /api/v1/products', () => {
    it('deve retornar 200 com lista paginada de produtos', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(1);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(401);
    });

    it('deve aceitar filtros de busca via query params', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(0);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/products?search=teste&page=1&limit=10')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('deve retornar 200 com produto existente', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const res = await request(app)
        .get('/api/v1/products/prod-1')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.nome).toBe('Produto Teste');
    });

    it('deve retornar 404 para produto não encontrado', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/products/naoexiste')
        .set('Authorization', `Bearer ${makeToken()}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/products', () => {
    it('deve criar produto e retornar 201', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null); // SKU único
      (prisma.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        id: 'prod-novo',
      });

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ nome: 'Novo Produto', preco: 15.0 });

      expect(res.status).toBe(201);
      expect(res.body.data.product.id).toBe('prod-novo');
    });

    it('deve retornar 422 para body inválido (sem nome)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ preco: 10 });

      expect(res.status).toBe(422);
    });

    it('deve retornar 422 para preço negativo', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ nome: 'Produto', preco: -5 });

      expect(res.status).toBe(422);
    });

    it('deve retornar 401 sem autenticação', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .send({ nome: 'Produto', preco: 10 });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    it('deve atualizar produto e retornar 200', async () => {
      (prisma.product.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockProduct) // findById → produto existe
        .mockResolvedValueOnce(null); // findBySku → SKU não duplicado
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        nome: 'Atualizado',
      });

      const res = await request(app)
        .put('/api/v1/products/prod-1')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ nome: 'Atualizado' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.nome).toBe('Atualizado');
    });

    it('deve retornar 404 ao atualizar produto inexistente', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .put('/api/v1/products/naoexiste')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ nome: 'Atualizado' });

      expect(res.status).toBe(404);
    });
  });
});
