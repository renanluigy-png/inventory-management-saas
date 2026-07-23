import { LogNivel } from '@prisma/client';
import { SystemLogRepository, CreateSystemLogInput } from '../repositories/SystemLogRepository';
import { logger } from '../utils/logger';

export class TechLogService {
  private repo: SystemLogRepository;
  constructor() { this.repo = new SystemLogRepository(); }

  async log(data: CreateSystemLogInput): Promise<void> {
    try {
      await this.repo.create(data);
    } catch (err) {
      logger.error('Falha ao salvar SystemLog', { err });
    }
  }

  async logError(
    mensagem: string,
    detalhes?: Record<string, unknown>,
    opts?: Partial<CreateSystemLogInput>
  ): Promise<void> {
    return this.log({ ...opts, nivel: LogNivel.ERROR, categoria: opts?.categoria ?? 'api', mensagem, detalhes });
  }

  async logRequest(opts: {
    path: string;
    metodo: string;
    statusCode: number;
    duracao: number;
    usuarioId?: string;
    companyId?: string;
    ip?: string;
  }): Promise<void> {
    const nivel = opts.statusCode >= 500
      ? LogNivel.ERROR
      : opts.statusCode >= 400
      ? LogNivel.WARN
      : opts.duracao >= 1000
      ? LogNivel.WARN
      : LogNivel.INFO;

    return this.log({ ...opts, nivel, categoria: 'request', mensagem: `${opts.metodo} ${opts.path} ${opts.statusCode} (${opts.duracao}ms)` });
  }

  async findAll(params: { companyId?: string; nivel?: LogNivel; categoria?: string; page?: number; limit?: number; desde?: string; ate?: string }) {
    return this.repo.findAll({
      ...params,
      desde: params.desde ? new Date(params.desde) : undefined,
      ate: params.ate ? new Date(params.ate) : undefined,
    });
  }

  async getSummary(companyId?: string) {
    const [countByNivel, slowRequests, recentErrors] = await Promise.all([
      this.repo.countByNivel(companyId),
      this.repo.getSlowRequests(500, 10),
      this.repo.getRecentErrors(10),
    ]);
    return { countByNivel, slowRequests, recentErrors };
  }

  async cleanup(days = 30): Promise<number> {
    return this.repo.deleteOlderThan(days);
  }
}
