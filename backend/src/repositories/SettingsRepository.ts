import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

// Valores padrão usados na inicialização (upsert do singleton)
const DEFAULTS = {
  nomeEmpresa: 'Minha Empresa',
  cnpj: null,
  telefone: null,
  email: null,
  endereco: null,
  logoUrl: null,
  tema: 'light',
  moeda: 'BRL',
  impostoPercent: 0,
  estoqueMinimoPadrao: 5,
  permitirVendaSemEstoque: false,
} satisfies Prisma.SystemSettingsCreateInput;

export class SettingsRepository {
  /**
   * Retorna as configurações atuais do sistema.
   * Se a linha ainda não existe, cria com os valores padrão (singleton).
   */
  async get() {
    const existing = await prisma.systemSettings.findFirst();
    if (existing) return existing;
    return prisma.systemSettings.create({ data: DEFAULTS });
  }

  /** Atualiza as configurações. Garante que o singleton exista antes de atualizar. */
  async update(data: Prisma.SystemSettingsUpdateInput) {
    const current = await this.get();
    return prisma.systemSettings.update({
      where: { id: current.id },
      data,
    });
  }
}
