import { HistoricoRepository, CreateHistoricoInput } from '../repositories/HistoricoRepository';

export class HistoricoService {
  private repo: HistoricoRepository;
  constructor() { this.repo = new HistoricoRepository(); }

  async registrar(data: CreateHistoricoInput) {
    try {
      return await this.repo.create(data);
    } catch {
      // Não propaga — histórico nunca derruba a operação principal
    }
  }

  async findByEntidade(entidade: string, entidadeId: string, companyId?: string) {
    return this.repo.findByEntidade(entidade, entidadeId, companyId);
  }

  async findAll(params: { entidade?: string; entidadeId?: string; companyId?: string; page?: number; limit?: number }) {
    return this.repo.findAll(params);
  }
}
