// Variáveis de ambiente para os testes (carregadas ANTES de qualquer import).
// Fonte única de verdade do ambiente de teste: cobre todas as variáveis
// obrigatórias de src/config/env.ts para que `npm test` seja idêntico local e no CI,
// sem depender de um .env local (que não existe no runner do GitHub Actions).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-for-jest-that-is-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '28800';
process.env.MASTER_SENHA = 'test-master-senha-12345';
process.env.PORT = '3334';
process.env.CORS_ORIGIN = 'http://localhost:5173';
