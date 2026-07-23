// Variáveis de ambiente para os testes (carregadas ANTES de qualquer import)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-for-jest-that-is-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '28800';
process.env.PORT = '3334';
process.env.CORS_ORIGIN = 'http://localhost:5173';
