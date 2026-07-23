import { FavoritoRepository, CreateFavoritoInput } from '../repositories/FavoritoRepository';
import { AppError } from '../utils/AppError';

const TIPOS_VALIDOS = ['produto', 'cliente', 'relatorio', 'pagina', 'consulta'];

export class FavoritoService {
  private repo: FavoritoRepository;
  constructor() { this.repo = new FavoritoRepository(); }

  async findByUser(userId: string) {
    const favs = await this.repo.findByUser(userId);
    const grouped: Record<string, typeof favs> = {};
    for (const f of favs) {
      if (!grouped[f.tipo]) grouped[f.tipo] = [];
      grouped[f.tipo].push(f);
    }
    return { items: favs, grouped };
  }

  async findByTipo(userId: string, tipo: string) {
    return this.repo.findByTipo(userId, tipo);
  }

  async isFavorito(userId: string, tipo: string, entidadeId: string) {
    return this.repo.isFavorito(userId, tipo, entidadeId);
  }

  async toggle(data: CreateFavoritoInput) {
    if (!TIPOS_VALIDOS.includes(data.tipo)) {
      throw new AppError(`Tipo inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}`, 400);
    }

    if (data.entidadeId) {
      const exists = await this.repo.isFavorito(data.userId, data.tipo, data.entidadeId);
      if (exists) {
        await this.repo.deleteByEntidade(data.userId, data.tipo, data.entidadeId);
        return { favorito: false };
      }
    }

    const created = await this.repo.create(data);
    return { favorito: true, data: created };
  }

  async create(data: CreateFavoritoInput) {
    if (!TIPOS_VALIDOS.includes(data.tipo)) {
      throw new AppError(`Tipo inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}`, 400);
    }
    return this.repo.create(data);
  }

  async delete(id: string, userId: string) {
    const f = await this.repo.findById(id);
    if (!f) throw new AppError('Favorito não encontrado.', 404);
    if (f.userId !== userId) throw new AppError('Sem permissão.', 403);
    await this.repo.delete(id);
  }

  async reordenar(userId: string, ordens: { id: string; ordem: number }[]) {
    await this.repo.updateOrdem(userId, ordens);
  }
}
