import { AuditAction } from '@prisma/client';
import { AuditRepository, CreateAuditLogData, FindAllAuditParams } from '../repositories/AuditRepository';
import { logger } from '../utils/logger';

export { AuditAction };

export class AuditService {
  private auditRepository: AuditRepository;

  constructor() {
    this.auditRepository = new AuditRepository();
  }

  /**
   * Registra um evento de auditoria de forma assíncrona e não-bloqueante.
   * Erros são absorvidos — o log de auditoria nunca deve derrubar a operação principal.
   */
  async log(data: CreateAuditLogData): Promise<void> {
    try {
      await this.auditRepository.create(data);
    } catch (err) {
      // Loga o erro no arquivo mas não propaga — auditoria não pode derrubar a API
      logger.error('Falha ao registrar audit log', {
        entidade: data.entidade,
        acao: data.acao,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Lista eventos de auditoria com filtros. */
  async findAll(params: FindAllAuditParams) {
    return this.auditRepository.findAll(params);
  }
}
