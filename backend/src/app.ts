import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { techLoggerMiddleware } from './middlewares/techLogger.middleware';
import { globalLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { logger } from './utils/logger';
import { SystemController } from './controllers/SystemController';

const REQUIRED_DIRS = ['logs', 'backups', 'uploads'];
for (const dir of REQUIRED_DIRS) {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logger.info(`Diretório criado: ${dir}/`);
  }
}

const app = express();
const systemController = new SystemController();

// Origens permitidas para o frontend. CORS_ORIGIN pode conter múltiplas
// origens separadas por vírgula; a origem oficial do GitHub Pages também é
// permitida explicitamente para a demonstração pública.
const allowedOrigins = new Set(
  [
    ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    'https://renanluigy-png.github.io',
  ]
);

// Render (e qualquer PaaS atrás de load balancer) envia X-Forwarded-For.
// Sem isto, express-rate-limit não consegue identificar o IP real do
// cliente e todos os usuários compartilham o mesmo bucket de limite.
// "1" = confia em exatamente um hop de proxy (o do Render), não em qualquer um.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Requisições sem Origin (health checks, ferramentas e chamadas server-to-server)
      // continuam permitidas.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida pelo CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(globalLimiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Controle de Estoque — API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);
app.get('/health', systemController.health);
app.use(auditMiddleware);
app.use(techLoggerMiddleware);
app.use('/api/v1', routes);
app.use(errorHandler);

export default app;
