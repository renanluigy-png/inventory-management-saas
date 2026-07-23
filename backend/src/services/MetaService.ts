import { MetaTipo, MetaPeriodo } from '@prisma/client';
import { MetaRepository, CreateMetaInput } from '../repositories/MetaRepository';
import { AppError } from '../utils/AppError';

export class MetaService {
  private repo: MetaRepository;
  constructor() { this.repo = new MetaRepository(); }

  async findAll(params: { companyId?: string; tipo?: MetaTipo; periodo?: MetaPeriodo; ativa?: boolean; page?: number; limit?: number }) {
    return this.repo.findAll(params);
  }

  async findById(id: string) {
    const meta = await this.repo.findById(id);
    if (!meta) throw new AppError('Meta não encontrada.', 404);
    return meta;
  }

  async findAtivas(companyId: string) {
    const metas = await this.repo.findAtivas(companyId);
    return Promise.all(metas.map((m) => this.enrichWithProgress(m)));
  }

  async create(data: CreateMetaInput) {
    if (new Date(data.inicioEm) >= new Date(data.fimEm)) {
      throw new AppError('Data de início deve ser anterior ao fim.', 400);
    }
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CreateMetaInput>) {
    await this.findById(id);
    return this.repo.update(id, data);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.repo.delete(id);
  }

  async getProgresso(id: string) {
    const meta = await this.findById(id);
    return this.enrichWithProgress(meta);
  }

  private async enrichWithProgress(meta: Awaited<ReturnType<MetaRepository['findById']>> & object) {
    if (!meta) throw new AppError('Meta não encontrada.', 404);

    let valorAtual = 0;
    const companyId = meta.companyId ?? undefined;

    switch (meta.tipo) {
      case MetaTipo.VENDAS_VALOR:
        valorAtual = await this.repo.getProgressoVendasValor(companyId!, meta.inicioEm, meta.fimEm);
        break;
      case MetaTipo.VENDAS_QUANTIDADE:
        valorAtual = await this.repo.getProgressoVendasQtd(companyId!, meta.inicioEm, meta.fimEm);
        break;
      case MetaTipo.CLIENTES_NOVOS:
        valorAtual = await this.repo.getProgressoClientesNovos(companyId!, meta.inicioEm, meta.fimEm);
        break;
      default:
        valorAtual = 0;
    }

    const valorAlvo = Number(meta.valorAlvo);
    const porcentagem = valorAlvo > 0 ? Math.min((valorAtual / valorAlvo) * 100, 100) : 0;
    const now = new Date();
    const totalDias = (meta.fimEm.getTime() - meta.inicioEm.getTime()) / 86400000;
    const diasPassados = Math.max(0, (now.getTime() - meta.inicioEm.getTime()) / 86400000);
    const ritmoEsperado = totalDias > 0 ? (diasPassados / totalDias) * 100 : 0;
    const previsao = diasPassados > 0 && totalDias > 0
      ? (valorAtual / diasPassados) * totalDias
      : valorAtual;

    return {
      ...meta,
      valorAtual,
      porcentagem: Math.round(porcentagem * 10) / 10,
      previsao: Math.round(previsao * 100) / 100,
      ritmoEsperado: Math.round(ritmoEsperado * 10) / 10,
      emDia: porcentagem >= ritmoEsperado,
      diasRestantes: Math.max(0, Math.ceil((meta.fimEm.getTime() - now.getTime()) / 86400000)),
    };
  }
}
