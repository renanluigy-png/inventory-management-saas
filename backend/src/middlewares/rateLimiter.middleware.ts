import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
    timestamp: new Date().toISOString(),
  },
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 1 minuto.',
    timestamp: new Date().toISOString(),
  },
});
