import { CategoryRepository } from '../repositories/CategoryRepository';
import { AppError } from '../utils/AppError';

export interface CreateCategoryDTO {
  nome: string;
  descricao?: string;
  companyId?: string | null;
}

export interface UpdateCategoryDTO {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface FindAllCategoryParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  orderBy?: 'nome' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  companyId?: string | null;
}

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async findAll(params: FindAllCategoryParams) {
    return this.categoryRepository.findAll(params);
  }

  async findById(id: string) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new AppError('Categoria não encontrada.', 404);
    }

    return category;
  }

  async create(dto: CreateCategoryDTO) {
    // Valida unicidade do nome (o Prisma também lançaria P2002, mas melhor dar erro claro)
    const existing = await this.categoryRepository.findByNome(dto.nome);
    if (existing) {
      throw new AppError(
        `Já existe uma categoria com o nome "${dto.nome}".`,
        409
      );
    }

    return this.categoryRepository.create({
      nome: dto.nome,
      descricao: dto.descricao,
      ...(dto.companyId && { companyId: dto.companyId }),
    });
  }

  async update(id: string, dto: UpdateCategoryDTO) {
    // Garante que a categoria existe
    await this.findById(id);

    // Valida unicidade do novo nome, excluindo a própria categoria
    if (dto.nome) {
      const existing = await this.categoryRepository.findByNome(dto.nome);
      if (existing && existing.id !== id) {
        throw new AppError(
          `Já existe uma categoria com o nome "${dto.nome}".`,
          409
        );
      }
    }

    return this.categoryRepository.update(id, dto);
  }

  async delete(id: string) {
    const category = await this.findById(id);

    // Impede exclusão se houver produtos ativos vinculados
    if (category._count.produtos > 0) {
      throw new AppError(
        `Não é possível desativar: esta categoria possui ${category._count.produtos} produto(s) ativo(s). ` +
          `Desative os produtos primeiro ou altere a categoria deles.`,
        409
      );
    }

    return this.categoryRepository.softDelete(id);
  }
}
