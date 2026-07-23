export type TipoImpressao = 'cupom' | 'a4' | 'etiqueta' | 'boleto';

export interface CupomItem {
  nome: string;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
}

export interface DadosCupom {
  nomeEmpresa: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  numeroVenda: number;
  data: Date;
  itens: CupomItem[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento?: string;
  troco?: number;
  nomeCliente?: string;
  operador: string;
  rodape?: string;
}

export interface DadosEtiqueta {
  nome: string;
  preco: number;
  codigoBarras?: string;
  sku?: string;
  quantidade?: number; // quantas etiquetas imprimir
}

export interface PrintResult {
  sucesso: boolean;
  provider: string;
  mensagem: string;
  dados?: unknown;
}

export interface IPrintProvider {
  readonly name: string;

  /** Imprime cupom de venda (formato 80mm ESC/POS ou similar). */
  imprimirCupom(dados: DadosCupom): Promise<PrintResult>;

  /** Imprime etiqueta de produto. */
  imprimirEtiqueta(dados: DadosEtiqueta): Promise<PrintResult>;

  /** Gera PDF A4 de um documento. */
  gerarPDFA4(dados: DadosCupom): Promise<Buffer>;
}
