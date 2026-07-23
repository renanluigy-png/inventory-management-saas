import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocketIO } from './websocket/socket';

const httpServer = createServer(app);
initSocketIO(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`Servidor iniciado na porta ${env.PORT} [${env.NODE_ENV}]`);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   ERP SaaS — Enterprise Premium (E15)     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Servidor: http://localhost:${env.PORT}`);
  console.log(`  Ambiente: ${env.NODE_ENV}`);
  console.log(`  Health:   http://localhost:${env.PORT}/health`);
  console.log(`  API:      http://localhost:${env.PORT}/api/v1`);
  console.log(`  WebSocket: ws://localhost:${env.PORT}/ws`);
  console.log(`  Docs:     http://localhost:${env.PORT}/docs\n`);
});

export default app;
