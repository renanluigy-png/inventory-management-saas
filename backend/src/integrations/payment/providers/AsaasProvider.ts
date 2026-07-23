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
 * Integração com Asaas — PIX via API v3.
 * Documentação: https://docs.asaas.com/reference/criar-nova-cobranca
 *
 * CONFIGURAR:
 *   ASAAS_API_KEY=$aact_xxxxxxxxxxxxxxxx
 *   ASAAS_ENV=sandbox  # ou production
 */
export class AsaasProvider implements IPaymentProvider {
  readonly name = 'asaas';

  private get baseUrl() {
    return env.ASAAS_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';
  }

  private getKey(): string {
    if (!env.ASAAS_API_KEY) {
      throw new AppError('Asaas não configurado. Defina ASAAS_API_KEY no .env.', 503);
    }
    return env.ASAAS_API_KEY;
  }

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    const key = this.getKey();
    const dueDate = new Date(Date.now() + (request.expiresInMinutes ?? 30) * 60_000);

    const body = {
      customer: await this.getOrCreateCustomer(request.pagador, key),
      billingType: 'PIX',
      value: request.valor,
      dueDate: dueDate.toISOString().split('T')[0],
      description: request.descricao ?? 'Pagamento ERP',
      externalReference: request.saleId,
    };

    const res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: { access_token: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AppError(`Asaas error: ${JSON.stringify(err)}`, 502);
    }

    const payment = await res.json() as { id: string };

    // Busca QR Code do pagamento criado
    const qrRes = await fetch(`${this.baseUrl}/payments/${payment.id}/pixQrCode`, {
      headers: { access_token: key },
    });

    const qrData = await qrRes.json() as { payload: string; encodedImage: string; expirationDate: string };

    return {
      txid: payment.id,
      qrCode: qrData.payload,
      qrCodeBase64: qrData.encodedImage,
      expiresAt: new Date(qrData.expirationDate),
      valor: request.valor,
      status: 'PENDENTE',
    };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const key = this.getKey();
    const res = await fetch(`${this.baseUrl}/payments/${txid}`, {
      headers: { access_token: key },
    });

    if (!res.ok) throw new AppError('Erro ao consultar pagamento no Asaas.', 502);
    const data = await res.json() as { id: string; status: string; value: number; confirmedDate?: string };

    const statusMap: Record<string, PixStatusResponse['status']> = {
      RECEIVED: 'PAGO', CONFIRMED: 'PAGO', PENDING: 'PENDENTE',
      CANCELED: 'CANCELADO', OVERDUE: 'EXPIRADO',
    };

    return {
      txid,
      status: statusMap[data.status] ?? 'PENDENTE',
      paidAt: data.confirmedDate ? new Date(data.confirmedDate) : undefined,
      valor: data.value,
    };
  }

  async cancelPayment(txid: string): Promise<void> {
    const key = this.getKey();
    await fetch(`${this.baseUrl}/payments/${txid}/cancel`, {
      method: 'DELETE',
      headers: { access_token: key },
    });
  }

  async parseWebhook(_headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    const payload = body as Record<string, unknown>;
    const payment = payload.payment as Record<string, unknown> | undefined;
    return {
      txid: String(payment?.id ?? ''),
      status: String(payload.event ?? ''),
      paidAt: payment?.confirmedDate ? String(payment.confirmedDate) : undefined,
      valor: payment?.value ? Number(payment.value) : undefined,
      rawPayload: payload,
    };
  }

  private async getOrCreateCustomer(
    pagador: PixPaymentRequest['pagador'],
    key: string
  ): Promise<string> {
    // Simplificado: cria cliente anônimo se não houver dados
    const body = {
      name: pagador?.nome ?? 'Cliente ERP',
      email: pagador?.email ?? `cliente+${Date.now()}@erp.local`,
      cpfCnpj: pagador?.cpf?.replace(/\D/g, '') ?? '00000000000',
    };

    const res = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: { access_token: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { id: string };
    return data.id;
  }
}
