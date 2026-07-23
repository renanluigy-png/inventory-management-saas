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
 * Integração com Stripe — Payment Intents (pagamentos internacionais).
 * Documentação: https://stripe.com/docs/api/payment_intents
 *
 * CONFIGURAR:
 *   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx
 *   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
 *
 * NOTA: Stripe não processa PIX diretamente (apenas em BR via parceiros).
 * Esta integração usa Payment Intents para card/boleto/pix conforme disponibilidade.
 */
export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe';
  private readonly baseUrl = 'https://api.stripe.com/v1';

  private getKey(): string {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe não configurado. Defina STRIPE_SECRET_KEY no .env.', 503);
    }
    return env.STRIPE_SECRET_KEY;
  }

  private async stripeRequest<T>(path: string, method = 'GET', body?: Record<string, string>): Promise<T> {
    const key = this.getKey();
    const opts: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    };

    if (body) {
      opts.body = new URLSearchParams(body).toString();
    }

    const res = await fetch(`${this.baseUrl}${path}`, opts);

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message: string } };
      throw new AppError(`Stripe error: ${err.error?.message ?? 'Unknown error'}`, 502);
    }

    return res.json() as Promise<T>;
  }

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    // Stripe: cria PaymentIntent com pix como método
    const data = await this.stripeRequest<{ id: string; client_secret: string; next_action?: { pix_display_qr_code?: { data: string; image_url_png: string } }; amount: number }>('/payment_intents', 'POST', {
      amount: String(Math.round(request.valor * 100)),
      currency: 'brl',
      payment_method_types: 'pix',
      description: request.descricao ?? 'Pagamento ERP',
      metadata: JSON.stringify({ saleId: request.saleId ?? '' }),
    });

    const pix = data.next_action?.pix_display_qr_code;
    const expiresAt = new Date(Date.now() + (request.expiresInMinutes ?? 30) * 60_000);

    return {
      txid: data.id,
      qrCode: pix?.data ?? data.client_secret,
      qrCodeBase64: pix?.image_url_png ?? '',
      expiresAt,
      valor: request.valor,
      status: 'PENDENTE',
    };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const data = await this.stripeRequest<{ id: string; status: string; amount: number; currency: string; created: number }>(`/payment_intents/${txid}`);

    const statusMap: Record<string, PixStatusResponse['status']> = {
      succeeded: 'PAGO', requires_payment_method: 'PENDENTE',
      processing: 'PENDENTE', canceled: 'CANCELADO',
    };

    return {
      txid,
      status: statusMap[data.status] ?? 'PENDENTE',
      paidAt: data.status === 'succeeded' ? new Date(data.created * 1000) : undefined,
      valor: data.amount / 100,
    };
  }

  async cancelPayment(txid: string): Promise<void> {
    await this.stripeRequest(`/payment_intents/${txid}/cancel`, 'POST');
  }

  async parseWebhook(headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    // Stripe envia assinatura em Stripe-Signature header
    // Verificar com STRIPE_WEBHOOK_SECRET em produção
    const payload = body as Record<string, unknown>;
    const dataObj = payload.data as Record<string, unknown> | undefined;
    const pi = dataObj?.object as Record<string, unknown> | undefined;

    return {
      txid: String(pi?.id ?? ''),
      status: String(payload.type ?? ''),
      paidAt: payload.type === 'payment_intent.succeeded'
        ? new Date((pi?.created as number ?? 0) * 1000).toISOString()
        : undefined,
      valor: pi?.amount ? Number(pi.amount) / 100 : undefined,
      rawPayload: payload,
    };
  }
}
