import { CustomerService } from '../../../services/CustomerService';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { AppError } from '../../../utils/AppError';

jest.mock('../../../repositories/CustomerRepository');

describe('CustomerService', () => {
  let service: CustomerService;

  const mockCustomer = {
    id: 'cust-1',
    nome: 'João Silva',
    cpf: '123.456.789-09',
    email: 'joao@email.com',
    telefone: '(11) 99999-0000',
    endereco: 'Rua A, 123',
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new CustomerService();
  });

  describe('findById', () => {
    it('deve retornar cliente quando existe', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await service.findById('cust-1');

      expect(result.id).toBe('cust-1');
      expect(result.nome).toBe('João Silva');
    });

    it('deve lançar AppError 404 quando cliente não existe', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('naoexiste')).rejects.toMatchObject({
        statusCode: 404,
        isOperational: true,
      });
    });
  });

  describe('create', () => {
    it('deve criar cliente com sucesso', async () => {
      (CustomerRepository.prototype.findByCpf as jest.Mock).mockResolvedValue(null);
      (CustomerRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);
      (CustomerRepository.prototype.create as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await service.create({
        nome: 'João Silva',
        cpf: '123.456.789-09',
        email: 'joao@email.com',
      });

      expect(result.nome).toBe('João Silva');
      expect(CustomerRepository.prototype.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar AppError 409 quando CPF já cadastrado', async () => {
      (CustomerRepository.prototype.findByCpf as jest.Mock).mockResolvedValue(mockCustomer);

      await expect(
        service.create({ nome: 'Outro', cpf: '123.456.789-09' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve lançar AppError 409 quando e-mail já cadastrado', async () => {
      (CustomerRepository.prototype.findByCpf as jest.Mock).mockResolvedValue(null);
      (CustomerRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(mockCustomer);

      await expect(
        service.create({ nome: 'Outro', email: 'joao@email.com' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve criar cliente sem CPF e sem e-mail sem checar unicidade', async () => {
      (CustomerRepository.prototype.create as jest.Mock).mockResolvedValue(mockCustomer);

      await service.create({ nome: 'Sem Dados' });

      expect(CustomerRepository.prototype.findByCpf).not.toHaveBeenCalled();
      expect(CustomerRepository.prototype.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve lançar AppError 404 quando cliente não existe', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.update('naoexiste', { nome: 'Novo' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('deve lançar AppError 409 ao tentar CPF de outro cliente', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(mockCustomer);
      (CustomerRepository.prototype.findByCpf as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        id: 'outro-cust',
      });

      await expect(
        service.update('cust-1', { cpf: '987.654.321-00' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve atualizar com sucesso quando dados são válidos', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(mockCustomer);
      (CustomerRepository.prototype.findByCpf as jest.Mock).mockResolvedValue(null);
      (CustomerRepository.prototype.update as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        nome: 'Nome Atualizado',
      });

      const result = await service.update('cust-1', { nome: 'Nome Atualizado' });

      expect(result.nome).toBe('Nome Atualizado');
    });
  });

  describe('delete', () => {
    it('deve realizar soft delete quando cliente existe', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(mockCustomer);
      (CustomerRepository.prototype.softDelete as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        ativo: false,
      });

      await service.delete('cust-1');

      expect(CustomerRepository.prototype.softDelete).toHaveBeenCalledWith('cust-1');
    });
  });
});
