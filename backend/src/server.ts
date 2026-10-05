import { createServer } from 'http';
import { execFileSync } from 'node:child_process';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocketIO } from './websocket/socket';
import { ensureDemoAccount } from './services/DemoAccountService';

const httpServer = createServer(app);
initSocketIO(httpServer);

async function prepareDatabase(): Promise<void> {
  logger.info('Preparando banco de dados: executando migrations...');

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npxCommand, ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  });

  logger.info('Migrations aplicadas com sucesso.');

  // Mantém a conta pública de demonstração disponível após cada deploy.
  await ensureDemoAccount();
  logger.info('Conta de demonstração verificada.');
}

async function startServer() {
  try {
    await prepareDatabase();

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
  } catch (error) {
    logger.error('Falha ao preparar banco de dados antes de iniciar o servidor.', error);
    process.exit(1);
  }
}

void startServer();

export default app;
