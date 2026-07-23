export interface PixPaymentRequest {
  valor: number;
  descricao?: string;
  saleId?: string;
  expiresInMinutes?: number;
  pagador?: {
    nome?: string;
    cpf?: string;
    email?: string;
  };
}

export interface PixPaymentResponse {
  txid: string;
  qrCode: string;          // payload copia-e-cola
  qrCodeBase64: string;    // imagem PNG em base64
  expiresAt: Date;
  valor: number;
  status: 'PENDENTE';
}

export interface PixStatusResponse {
  txid: string;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'EXPIRADO';
  paidAt?: Date;
  valor: number;
}

export interface PixWebhookPayload {
  txid: string;
  status: string;
  paidAt?: string;
  valor?: number;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly name: string;

  /** Gera um QR Code PIX para pagamento. */
  createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse>;

  /** Consulta o status de um pagamento. */
  getPaymentStatus(txid: string): Promise<PixStatusResponse>;

  /** Cancela um pagamento pendente. */
  cancelPayment(txid: string): Promise<void>;

  /** Valida e parseia o webhook enviado pelo provedor. */
  parseWebhook(headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload>;
}
