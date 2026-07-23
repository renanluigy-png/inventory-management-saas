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
 * Integração com PagSeguro — PIX via API v4.
 * Documentação: https://dev.pagbank.uol.com.br/reference/cria-ordem-de-pagamento
 *
 * CONFIGURAR:
 *   PAGSEGURO_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   PAGSEGURO_EMAIL=email@empresa.com
 */
export class PagSeguroProvider implements IPaymentProvider {
  readonly name = 'pagseguro';
  private readonly baseUrl = 'https://api.pagseguro.com';

  private getToken(): string {
    if (!env.PAGSEGURO_TOKEN) {
      throw new AppError(
        'PagSeguro não configurado. Defina PAGSEGURO_TOKEN no .env.',
        503
      );
    }
    return env.PAGSEGURO_TOKEN;
  }

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    const token = this.getToken();
    const expiresAt = new Date(Date.now() + (request.expiresInMinutes ?? 30) * 60_000);

    const body = {
      reference_id: request.saleId ?? String(Date.now()),
      customer: {
        name: request.pagador?.nome ?? 'Cliente ERP',
        email: request.pagador?.email ?? 'cliente@erp.local',
        tax_id: request.pagador?.cpf?.replace(/\D/g, '') ?? '00000000000',
      },
      items: [{ name: request.descricao ?? 'Pagamento ERP', quantity: 1, unit_amount: Math.round(request.valor * 100) }],
      qr_codes: [{ amount: { value: Math.round(request.valor * 100) }, expiration_date: expiresAt.toISOString() }],
    };

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AppError(`PagSeguro error: ${JSON.stringify(err)}`, 502);
    }

    const data = await res.json() as {
      id: string;
      qr_codes: Array<{ id: string; text: string; links: Array<{ href: string; media: string }> }>;
    };

    const qrCodeData = data.qr_codes[0];
    const imageLink = qrCodeData?.links?.find((l) => l.media === 'image/png')?.href ?? '';

    return {
      txid: qrCodeData?.id ?? data.id,
      qrCode: qrCodeData?.text ?? '',
      qrCodeBase64: imageLink, // PagSeguro retorna URL, não base64 diretamente
      expiresAt,
      valor: request.valor,
      status: 'PENDENTE',
    };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/orders/${txid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new AppError('Erro ao consultar pagamento no PagSeguro.', 502);
    const data = await res.json() as { id: string; status: string; summary?: { paid?: number } };

    const statusMap: Record<string, PixStatusResponse['status']> = {
      PAID: 'PAGO', WAITING: 'PENDENTE', CANCELED: 'CANCELADO',
    };

    return { txid, status: statusMap[data.status] ?? 'PENDENTE', valor: (data.summary?.paid ?? 0) / 100 };
  }

  async cancelPayment(_txid: string): Promise<void> {
    // PagSeguro — implementar via API de cancelamento quando disponível
    throw new AppError('Cancelamento automático não implementado para PagSeguro neste provedor.', 501);
  }

  async parseWebhook(_headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    const payload = body as Record<string, unknown>;
    return { txid: String(payload.id ?? ''), status: String(payload.type ?? ''), rawPayload: payload };
  }
}
