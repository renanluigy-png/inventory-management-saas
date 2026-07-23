import { SettingsRepository } from '../repositories/SettingsRepository';
import { appCache, CacheKeys } from '../utils/cache';

export interface UpdateSettingsDTO {
  nomeEmpresa?: string;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  logoUrl?: string | null;
  tema?: string;
  moeda?: string;
  impostoPercent?: number;
  estoqueMinimoPadrao?: number;
  permitirVendaSemEstoque?: boolean;
}

export class SettingsService {
  private settingsRepository: SettingsRepository;

  constructor() {
    this.settingsRepository = new SettingsRepository();
  }

  /** Retorna as configurações do sistema (usa cache de 5 minutos). */
  async get() {
    const cached = appCache.get(CacheKeys.SETTINGS);
    if (cached) return cached;

    const settings = await this.settingsRepository.get();
    appCache.set(CacheKeys.SETTINGS, settings);
    return settings;
  }

  /** Atualiza as configurações e invalida o cache. */
  async update(dto: UpdateSettingsDTO) {
    const settings = await this.settingsRepository.update({
      ...dto,
      ...(dto.impostoPercent !== undefined && { impostoPercent: dto.impostoPercent }),
    });
    appCache.del(CacheKeys.SETTINGS); // invalida cache após atualização
    return settings;
  }
}
