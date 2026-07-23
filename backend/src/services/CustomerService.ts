import { CustomerRepository, FindAllCustomerParams } from '../repositories/CustomerRepository';
import { AppError } from '../utils/AppError';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

export interface CreateCustomerDTO {
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  companyId?: string | null;
}

export interface UpdateCustomerDTO {
  nome?: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  ativo?: boolean;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async findAll(params: FindAllCustomerParams) {
    return this.customerRepository.findAll(params);
  }

  async findById(id: string) {
    const customer = await this.customerRepository.findById(id);

    if (!customer) {
      throw new AppError('Cliente não encontrado.', 404);
    }

    return customer;
  }

  async create(dto: CreateCustomerDTO) {
    // Valida unicidade do CPF antes de tentar inserir
    if (dto.cpf) {
      const existingByCpf = await this.customerRepository.findByCpf(dto.cpf);
      if (existingByCpf) {
        throw new AppError(
          'Já existe um cliente cadastrado com este CPF.',
          409
        );
      }
    }

    // Valida unicidade do e-mail antes de tentar inserir
    if (dto.email) {
      const existingByEmail = await this.customerRepository.findByEmail(dto.email);
      if (existingByEmail) {
        throw new AppError(
          'Já existe um cliente cadastrado com este e-mail.',
          409
        );
      }
    }

    return this.customerRepository.create({
      nome: dto.nome,
      cpf: dto.cpf,
      email: dto.email,
      telefone: dto.telefone,
      endereco: dto.endereco,
      ...(dto.companyId && { companyId: dto.companyId }),
    });
  }

  async update(id: string, dto: UpdateCustomerDTO) {
    // Garante que o cliente existe e obtém os dados atuais para comparação
    const current = await this.findById(id);

    // Valida unicidade do CPF apenas se foi fornecido e mudou
    if (dto.cpf !== undefined && dto.cpf !== null && dto.cpf !== current.cpf) {
      const existingByCpf = await this.customerRepository.findByCpf(dto.cpf);
      if (existingByCpf && existingByCpf.id !== id) {
        throw new AppError(
          'Já existe um cliente cadastrado com este CPF.',
          409
        );
      }
    }

    // Valida unicidade do e-mail apenas se foi fornecido e mudou
    if (
      dto.email !== undefined &&
      dto.email !== null &&
      dto.email !== current.email
    ) {
      const existingByEmail = await this.customerRepository.findByEmail(dto.email);
      if (existingByEmail && existingByEmail.id !== id) {
        throw new AppError(
          'Já existe um cliente cadastrado com este e-mail.',
          409
        );
      }
    }

    // Monta o input do Prisma com apenas os campos fornecidos no DTO
    // O Prisma ignora campos undefined nativamente, mas sendo explícitos aqui
    // garantimos que null (limpar campo) seja tratado corretamente
    return this.customerRepository.update(id, {
      ...(dto.nome !== undefined && { nome: dto.nome }),
      ...(dto.cpf !== undefined && { cpf: dto.cpf }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.telefone !== undefined && { telefone: dto.telefone }),
      ...(dto.endereco !== undefined && { endereco: dto.endereco }),
      ...(dto.ativo !== undefined && { ativo: dto.ativo }),
    });
  }

  async delete(id: string) {
    // Valida existência antes de desativar
    await this.findById(id);
    return this.customerRepository.softDelete(id);
  }
}
