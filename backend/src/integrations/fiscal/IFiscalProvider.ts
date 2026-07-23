export type TipoDocumento = 'NFCE' | 'NFE' | 'SAT' | 'CUPOM';

export interface ItemFiscal {
  codigo: string;
  descricao: string;
  ncm?: string;           // Nomenclatura Comum do Mercosul
  cfop?: string;          // Código Fiscal de Operações e Prestações
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  aliquotaICMS?: number;
}

export interface EmissaoFiscalRequest {
  tipo: TipoDocumento;
  saleId?: string;
  numero?: string;
  serie?: string;
  dataEmissao?: Date;
  emitente: {
    cnpj: string;
    nomeEmpresa: string;
    ie?: string;           // Inscrição Estadual
    endereco: string;
  };
  destinatario?: {
    cpf?: string;
    cnpj?: string;
    nome?: string;
    email?: string;
  };
  itens: ItemFiscal[];
  pagamento: {
    formaPagamento: string; // 01=Dinheiro, 03=Cartão, 17=PIX, etc.
    valor: number;
    troco?: number;
  };
  desconto?: number;
  totalBruto: number;
  totalLiquido: number;
}

export interface EmissaoFiscalResponse {
  chaveAcesso: string;
  numero: string;
  serie: string;
  xml?: string;
  pdf?: string;
  qrCode?: string;        // URL ou payload QR da NFC-e
  urlDanfe?: string;
  protocolo?: string;
  dataAutorizacao: Date;
  status: 'emitido' | 'cancelado' | 'erro';
  mensagem?: string;
}

export interface CancelamentoFiscalResponse {
  chaveAcesso: string;
  protocolo: string;
  dataAutorizacao: Date;
  status: 'cancelado' | 'erro';
  mensagem?: string;
}

export interface IFiscalProvider {
  readonly name: string;
  readonly tiposSuportados: TipoDocumento[];

  /** Emite um documento fiscal. */
  emitir(request: EmissaoFiscalRequest): Promise<EmissaoFiscalResponse>;

  /** Cancela um documento fiscal emitido. */
  cancelar(chaveAcesso: string, motivo: string): Promise<CancelamentoFiscalResponse>;

  /** Consulta o status de um documento. */
  consultar(chaveAcesso: string): Promise<EmissaoFiscalResponse>;
}
