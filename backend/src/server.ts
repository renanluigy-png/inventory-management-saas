import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocketIO } from './websocket/socket';

const httpServer = createServer(app);
initSocketIO(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`Servidor iniciado na porta ${env.PORT} [${env.NODE_ENV}]`);

  // Render expõe a URL pública do serviço em RENDER_EXTERNAL_URL — usamos
  // isso no banner para não exibir "localhost" em produção.
  const publicUrl = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${env.PORT}`;
  const wsUrl = publicUrl.replace(/^http/, 'ws');

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   ERP SaaS — Enterprise Premium (E15)     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n  Servidor: ${publicUrl}`);
  console.log(`  Ambiente: ${env.NODE_ENV}`);
  console.log(`  Health:   ${publicUrl}/health`);
  console.log(`  API:      ${publicUrl}/api/v1`);
  console.log(`  WebSocket: ${wsUrl}/ws`);
  console.log(`  Docs:     ${publicUrl}/docs\n`);
});

export default app;
