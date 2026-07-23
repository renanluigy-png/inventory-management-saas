import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  IPaymentProvider,
  PixPaymentRequest,
  PixPaymentResponse,
  PixStatusResponse,
  PixWebhookPayload,
} from '../IPaymentProvider';

// In-memory store para simular estado (apenas mock)
const paymentStore = new Map<string, { status: 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'EXPIRADO'; valor: number; expiresAt: Date }>();

export class MockPixProvider implements IPaymentProvider {
  readonly name = 'mock';

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    const txid = `MOCK${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + (request.expiresInMinutes ?? 30) * 60_000);

    // Payload PIX simulado (formato EMV-like simplificado)
    const qrCode = [
      '00020126580014br.gov.bcb.pix',
      '0136f3d56a2d-1234-4567-abcd-' + txid.toLowerCase(),
      `0217${request.descricao?.substring(0, 17) ?? 'Pagamento ERP'}`,
      '52040000',
      '5303986',
      `54${String(request.valor.toFixed(2)).length.toString().padStart(2, '0')}${request.valor.toFixed(2)}`,
      '5802BR',
      '5913ERP Sistema',
      '6008Brasilia',
      `62140510${txid.substring(0, 10)}`,
      '6304ABCD',
    ].join('');

    const qrCodeBase64 = await QRCode.toDataURL(qrCode).then((url) =>
      url.replace('data:image/png;base64,', '')
    );

    paymentStore.set(txid, { status: 'PENDENTE', valor: request.valor, expiresAt });

    return { txid, qrCode, qrCodeBase64, expiresAt, valor: request.valor, status: 'PENDENTE' };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const stored = paymentStore.get(txid);
    if (!stored) return { txid, status: 'EXPIRADO', valor: 0 };

    if (stored.expiresAt < new Date() && stored.status === 'PENDENTE') {
      stored.status = 'EXPIRADO';
    }

    return { txid, status: stored.status, valor: stored.valor };
  }

  async cancelPayment(txid: string): Promise<void> {
    const stored = paymentStore.get(txid);
    if (stored) stored.status = 'CANCELADO';
  }

  async parseWebhook(_headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    const payload = body as Record<string, unknown>;
    return {
      txid: String(payload.txid ?? ''),
      status: String(payload.status ?? 'PAGO'),
      paidAt: payload.paidAt ? String(payload.paidAt) : undefined,
      valor: payload.valor ? Number(payload.valor) : undefined,
      rawPayload: payload,
    };
  }

  /** Força confirmação de pagamento (apenas para testes/mock). */
  simulatePaymentConfirmation(txid: string): void {
    const stored = paymentStore.get(txid);
    if (stored) {
      stored.status = 'PAGO';
    }
  }
}
