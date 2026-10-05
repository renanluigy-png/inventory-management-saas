import { createServer } from 'http';
import { execFileSync } from 'node:child_process';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocketIO } from './websocket/socket';
import { ensureDemoAccount } from './services/DemoAccountService';

const httpServer = createServer(app);
initSocketIO(httpServer);

function runPrismaCommand(args: string[]): void {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  execFileSync(npxCommand, ['prisma', ...args], {
    stdio: 'inherit',
    env: process.env,
  });
}

async function prepareDatabase(): Promise<void> {
  logger.info('Preparando banco de dados...');

  // Mantém o histórico de migrations atualizado quando existir uma migration
  // pendente e, em seguida, reconcilia o banco com o schema Prisma atual.
  runPrismaCommand(['migrate', 'deploy']);
  runPrismaCommand(['db', 'push', '--skip-generate', '--accept-data-loss']);

  logger.info('Schema Prisma aplicado com sucesso.');

  // Mantém a conta pública de demonstração disponível após cada deploy.
  await ensureDemoAccount();
  logger.info('Conta de demonstração verificada.');
}

async function startServer() {
  try {
    await prepareDatabase();

    httpServer.listen(env.PORT, () => {
      logger.info(`Servidor iniciado na porta ${env.PORT} [${env.NODE_ENV}]`);

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
