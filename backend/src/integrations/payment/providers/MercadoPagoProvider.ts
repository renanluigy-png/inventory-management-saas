import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import {
  IPaymentProvider,
  PixPaymentRequest,
  PixPaymentResponse,
  PixStatusResponse,
  PixWebhookPayload,
} from '../IPaymentProvider';

/**
 * Integração com Mercado Pago — PIX via Payments API.
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/other-payment-methods/Brazil/pix
 *
 * CONFIGURAR nas variáveis de ambiente:
 *   MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
 */
export class MercadoPagoProvider implements IPaymentProvider {
  readonly name = 'mercadopago';
  private readonly baseUrl = 'https://api.mercadopago.com';

  private getToken(): string {
    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new AppError(
        'Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no .env.',
        503
      );
    }
    return env.MERCADOPAGO_ACCESS_TOKEN;
  }

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    const token = this.getToken();

    const body = {
      transaction_amount: request.valor,
      description: request.descricao ?? 'Pagamento ERP',
      payment_method_id: 'pix',
      payer: {
        email: request.pagador?.email ?? 'cliente@erp.local',
        first_name: request.pagador?.nome?.split(' ')[0] ?? 'Cliente',
        identification: {
          type: 'CPF',
          number: request.pagador?.cpf?.replace(/\D/g, '') ?? '00000000000',
        },
      },
      date_of_expiration: new Date(
        Date.now() + (request.expiresInMinutes ?? 30) * 60_000
      ).toISOString(),
    };

    const res = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': request.saleId ?? String(Date.now()),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AppError(`Mercado Pago error: ${JSON.stringify(err)}`, 502);
    }

    const data = await res.json() as {
      id: number;
      point_of_interaction: {
        transaction_data: {
          qr_code: string;
          qr_code_base64: string;
        };
      };
      date_of_expiration: string;
    };

    return {
      txid: String(data.id),
      qrCode: data.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
      expiresAt: new Date(data.date_of_expiration),
      valor: request.valor,
      status: 'PENDENTE',
    };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const token = this.getToken();

    const res = await fetch(`${this.baseUrl}/v1/payments/${txid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new AppError('Erro ao consultar pagamento no Mercado Pago.', 502);

    const data = await res.json() as { id: number; status: string; transaction_amount: number; date_approved?: string };

    const statusMap: Record<string, PixStatusResponse['status']> = {
      approved: 'PAGO',
      pending: 'PENDENTE',
      cancelled: 'CANCELADO',
      rejected: 'CANCELADO',
    };

    return {
      txid,
      status: statusMap[data.status] ?? 'EXPIRADO',
      paidAt: data.date_approved ? new Date(data.date_approved) : undefined,
      valor: data.transaction_amount,
    };
  }

  async cancelPayment(txid: string): Promise<void> {
    const token = this.getToken();
    await fetch(`${this.baseUrl}/v1/payments/${txid}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  async parseWebhook(headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    const payload = body as Record<string, unknown>;
    const data = payload.data as Record<string, unknown> | undefined;
    return {
      txid: String(data?.id ?? payload.id ?? ''),
      status: String(payload.action ?? 'payment.created'),
      rawPayload: payload,
    };
  }
}
