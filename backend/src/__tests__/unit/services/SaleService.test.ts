import { SaleService } from '../../../services/SaleService';
import { SaleRepository } from '../../../repositories/SaleRepository';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { AppError } from '../../../utils/AppError';
import type { SaleFull } from '../../../repositories/SaleRepository';

jest.mock('../../../repositories/SaleRepository');
jest.mock('../../../repositories/ProductRepository');
jest.mock('../../../repositories/CustomerRepository');

describe('SaleService', () => {
  let service: SaleService;

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU001',
    nome: 'Produto Teste',
    preco: 10.0,
    precoCusto: 5.0,
    estoque: 50,
    estoqueMinimo: 5,
    codigoBarras: null,
    unidade: 'UN',
    imagemUrl: null,
    ativo: true,
    categoryId: null,
    category: null,
    descricao: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer = {
    id: 'cust-1',
    nome: 'Cliente',
    cpf: null,
    email: null,
    telefone: null,
    endereco: null,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makeSale = (overrides: Partial<SaleFull> = {}): SaleFull =>
    ({
      id: 'sale-1',
      userId: 'user-1',
      customerId: null,
      customer: null,
      user: { id: 'user-1', nome: 'Admin' },
      formaPagamento: null,
      status: 'ABERTA' as const,
      desconto: 0,
      total: 0,
      observacao: null,
      itens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as unknown as SaleFull;

  beforeEach(() => {
    service = new SaleService();
  });

  describe('criarVenda', () => {
    it('deve criar venda sem cliente', async () => {
      (SaleRepository.prototype.create as jest.Mock).mockResolvedValue(makeSale());

      const result = await service.criarVenda({ userId: 'user-1' });

      expect(result.id).toBe('sale-1');
      expect(SaleRepository.prototype.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar venda com cliente válido', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(mockCustomer);
      (SaleRepository.prototype.create as jest.Mock).mockResolvedValue(
        makeSale({ customerId: 'cust-1' })
      );

      const result = await service.criarVenda({ userId: 'user-1', customerId: 'cust-1' });

      expect(result.customerId).toBe('cust-1');
    });

    it('deve lançar AppError 404 quando cliente não existe', async () => {
      (CustomerRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.criarVenda({ userId: 'user-1', customerId: 'naoexiste' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('adicionarItem', () => {
    it('deve lançar AppError 404 quando produto não existe', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(makeSale());
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.adicionarItem('sale-1', { productId: 'naoexiste', quantidade: 1 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deve lançar AppError 422 quando produto está inativo', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(makeSale());
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue({
        ...mockProduct,
        ativo: false,
      });

      await expect(
        service.adicionarItem('sale-1', { productId: 'prod-1', quantidade: 1 })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve lançar AppError 422 quando desconto excede valor do item', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(makeSale());
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(mockProduct);

      await expect(
        service.adicionarItem('sale-1', {
          productId: 'prod-1',
          quantidade: 1,
          desconto: 100,
        })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve lançar AppError 422 ao tentar adicionar item em venda não ABERTA', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(
        makeSale({ status: 'FINALIZADA' as const })
      );

      await expect(
        service.adicionarItem('sale-1', { productId: 'prod-1', quantidade: 1 })
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('finalizar', () => {
    it('deve lançar AppError 422 quando venda não tem itens', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(makeSale());

      await expect(
        service.finalizar('sale-1', 'user-1', { formaPagamento: 'DINHEIRO' })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve lançar AppError 422 quando não há forma de pagamento', async () => {
      const saleWithItems = makeSale({
        itens: [
          {
            id: 'item-1',
            saleId: 'sale-1',
            productId: 'prod-1',
            product: mockProduct,
            precoUnit: 10,
            quantidade: 1,
            desconto: 0,
            subtotal: 10,
          },
        ] as unknown as SaleFull['itens'],
        formaPagamento: null,
      });
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(saleWithItems);

      await expect(
        service.finalizar('sale-1', 'user-1', {})
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve lançar AppError 422 quando estoque insuficiente para item', async () => {
      const saleWithItems = makeSale({
        itens: [
          {
            id: 'item-1',
            saleId: 'sale-1',
            productId: 'prod-1',
            product: { ...mockProduct, estoque: 1 },
            precoUnit: 10,
            quantidade: 5,
            desconto: 0,
            subtotal: 50,
          },
        ] as unknown as SaleFull['itens'],
        formaPagamento: 'DINHEIRO' as const,
      });
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(saleWithItems);

      await expect(
        service.finalizar('sale-1', 'user-1', { formaPagamento: 'DINHEIRO' })
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('cancelar', () => {
    it('deve cancelar venda ABERTA com sucesso', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(makeSale());
      (SaleRepository.prototype.cancel as jest.Mock).mockResolvedValue(
        makeSale({ status: 'CANCELADA' as const })
      );

      const result = await service.cancelar('sale-1', 'Cancelado pelo usuário');

      expect(SaleRepository.prototype.cancel).toHaveBeenCalledWith('sale-1', 'Cancelado pelo usuário');
    });

    it('deve lançar AppError 422 ao tentar cancelar venda FINALIZADA', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(
        makeSale({ status: 'FINALIZADA' as const })
      );

      await expect(service.cancelar('sale-1')).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve lançar AppError 422 ao tentar cancelar venda já CANCELADA', async () => {
      (SaleRepository.prototype.findById as jest.Mock).mockResolvedValue(
        makeSale({ status: 'CANCELADA' as const })
      );

      await expect(service.cancelar('sale-1')).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
