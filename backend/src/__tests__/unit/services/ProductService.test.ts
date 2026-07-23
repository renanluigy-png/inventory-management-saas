import { ProductService } from '../../../services/ProductService';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { AppError } from '../../../utils/AppError';

jest.mock('../../../repositories/ProductRepository');
jest.mock('../../../repositories/CategoryRepository');
jest.mock('../../../utils/sku', () => ({ gerarSKU: jest.fn().mockReturnValue('AUTO-001') }));

describe('ProductService', () => {
  let service: ProductService;

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU001',
    nome: 'Produto Teste',
    descricao: null,
    preco: 10.0,
    precoCusto: 5.0,
    estoque: 100,
    estoqueMinimo: 5,
    codigoBarras: null,
    unidade: 'UN',
    imagemUrl: null,
    ativo: true,
    categoryId: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new ProductService();
  });

  describe('findById', () => {
    it('deve retornar produto quando existe', async () => {
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.nome).toBe('Produto Teste');
    });

    it('deve lançar AppError 404 quando produto não existe', async () => {
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('naoexiste')).rejects.toMatchObject({
        statusCode: 404,
        isOperational: true,
      });
    });
  });

  describe('create', () => {
    it('deve criar produto com SKU gerado automaticamente', async () => {
      (ProductRepository.prototype.findBySku as jest.Mock).mockResolvedValue(null);
      (ProductRepository.prototype.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        sku: 'AUTO-001',
      });

      const result = await service.create({ nome: 'Novo Produto', preco: 10 });

      expect(ProductRepository.prototype.create).toHaveBeenCalled();
      expect(result.sku).toBe('AUTO-001');
    });

    it('deve usar o SKU fornecido quando único', async () => {
      (ProductRepository.prototype.findBySku as jest.Mock).mockResolvedValue(null);
      (ProductRepository.prototype.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        sku: 'MEUSKU',
      });

      await service.create({ nome: 'Produto', preco: 10, sku: 'MEUSKU' });

      const callArg = (ProductRepository.prototype.create as jest.Mock).mock.calls[0][0];
      expect(callArg.sku).toBe('MEUSKU');
    });

    it('deve lançar AppError 409 quando SKU já existe', async () => {
      (ProductRepository.prototype.findBySku as jest.Mock).mockResolvedValue(mockProduct);

      await expect(
        service.create({ nome: 'Produto', preco: 10, sku: 'SKU001' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve lançar AppError 404 quando categoria não encontrada', async () => {
      (CategoryRepository.prototype.existsAndActive as jest.Mock).mockResolvedValue(false);

      await expect(
        service.create({
          nome: 'Produto',
          preco: 10,
          categoryId: 'cat-inexistente',
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('ajustarEstoque', () => {
    beforeEach(() => {
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(mockProduct);
    });

    it('deve lançar AppError 422 ao tentar SAIDA com estoque insuficiente', async () => {
      await expect(
        service.ajustarEstoque('prod-1', {
          tipo: 'SAIDA',
          quantidade: 200,
          userId: 'user-1',
        })
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deve processar ENTRADA somando ao estoque atual', async () => {
      (ProductRepository.prototype.ajustarEstoque as jest.Mock).mockResolvedValue({
        movimentacao: {},
        produto: { ...mockProduct, estoque: 110 },
      });

      const result = await service.ajustarEstoque('prod-1', {
        tipo: 'ENTRADA',
        quantidade: 10,
        userId: 'user-1',
      });

      expect(result.estoqueAnterior).toBe(100);
      expect(result.estoqueAtual).toBe(110);
    });

    it('deve processar AJUSTE definindo o novo estoque', async () => {
      (ProductRepository.prototype.ajustarEstoque as jest.Mock).mockResolvedValue({
        movimentacao: {},
        produto: { ...mockProduct, estoque: 50 },
      });

      const result = await service.ajustarEstoque('prod-1', {
        tipo: 'AJUSTE',
        novoEstoque: 50,
        userId: 'user-1',
      });

      expect(result.estoqueAtual).toBe(50);
    });
  });

  describe('delete', () => {
    it('deve chamar softDelete quando produto existe', async () => {
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(mockProduct);
      (ProductRepository.prototype.softDelete as jest.Mock).mockResolvedValue({
        ...mockProduct,
        ativo: false,
      });

      await service.delete('prod-1');

      expect(ProductRepository.prototype.softDelete).toHaveBeenCalledWith('prod-1');
    });

    it('deve lançar AppError 404 ao tentar deletar produto inexistente', async () => {
      (ProductRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('naoexiste')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
