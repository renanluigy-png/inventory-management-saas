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
 * Integração com Gerencianet (Efí) — PIX via API v2.
 * Documentação: https://dev.efipay.com.br/docs/api-pix/
 *
 * CONFIGURAR:
 *   GERENCIANET_CLIENT_ID=xxxxxxxx
 *   GERENCIANET_CLIENT_SECRET=xxxxxxxx
 *   GERENCIANET_PIX_KEY=+55119xxxxxxxx | chave@email.com | CPF | CNPJ | aleatoria
 *   GERENCIANET_ENV=sandbox  # ou production
 */
export class GerencianetProvider implements IPaymentProvider {
  readonly name = 'gerencianet';
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl() {
    return env.GERENCIANET_ENV === 'production'
      ? 'https://api-pix.gerencianet.com.br'
      : 'https://pix-h.api.efipay.com.br';
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!env.GERENCIANET_CLIENT_ID || !env.GERENCIANET_CLIENT_SECRET) {
      throw new AppError('Gerencianet não configurado. Defina GERENCIANET_CLIENT_ID e GERENCIANET_CLIENT_SECRET.', 503);
    }

    const credentials = Buffer.from(
      `${env.GERENCIANET_CLIENT_ID}:${env.GERENCIANET_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });

    if (!res.ok) throw new AppError('Falha ao autenticar na Gerencianet.', 502);

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    const token = await this.authenticate();
    const pixKey = env.GERENCIANET_PIX_KEY;
    if (!pixKey) throw new AppError('GERENCIANET_PIX_KEY não configurada.', 503);

    const expiresAt = new Date(Date.now() + (request.expiresInMinutes ?? 30) * 60_000);

    // Cria cobrança imediata (cob)
    const cobBody = {
      calendario: { expiracao: (request.expiresInMinutes ?? 30) * 60 },
      devedor: {
        nome: request.pagador?.nome ?? 'Cliente ERP',
        cpf: request.pagador?.cpf?.replace(/\D/g, '') ?? '00000000000',
      },
      valor: { original: request.valor.toFixed(2) },
      chave: pixKey,
      infoAdicionais: [{ nome: 'Venda', valor: request.saleId ?? 'ERP' }],
    };

    const cobRes = await fetch(`${this.baseUrl}/v2/cob`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cobBody),
    });

    if (!cobRes.ok) {
      const err = await cobRes.json().catch(() => ({}));
      throw new AppError(`Gerencianet error: ${JSON.stringify(err)}`, 502);
    }

    const cob = await cobRes.json() as { txid: string; loc: { id: number } };

    // Gera QR Code
    const qrRes = await fetch(`${this.baseUrl}/v2/loc/${cob.loc.id}/qrcode`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const qr = await qrRes.json() as { qrcode: string; imagemQrcode: string };

    return {
      txid: cob.txid,
      qrCode: qr.qrcode,
      qrCodeBase64: qr.imagemQrcode.replace('data:image/png;base64,', ''),
      expiresAt,
      valor: request.valor,
      status: 'PENDENTE',
    };
  }

  async getPaymentStatus(txid: string): Promise<PixStatusResponse> {
    const token = await this.authenticate();
    const res = await fetch(`${this.baseUrl}/v2/cob/${txid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new AppError('Erro ao consultar cobrança na Gerencianet.', 502);
    const data = await res.json() as { txid: string; status: string; valor: { original: string }; pix?: Array<{ horario: string }> };

    const statusMap: Record<string, PixStatusResponse['status']> = {
      ATIVA: 'PENDENTE', CONCLUIDA: 'PAGO', REMOVIDA_PELO_USUARIO_RECEBEDOR: 'CANCELADO',
      REMOVIDA_PELO_PSP: 'CANCELADO',
    };

    return {
      txid,
      status: statusMap[data.status] ?? 'PENDENTE',
      paidAt: data.pix?.[0]?.horario ? new Date(data.pix[0].horario) : undefined,
      valor: parseFloat(data.valor.original),
    };
  }

  async cancelPayment(txid: string): Promise<void> {
    const token = await this.authenticate();
    await fetch(`${this.baseUrl}/v2/cob/${txid}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' }),
    });
  }

  async parseWebhook(_headers: Record<string, string>, body: unknown): Promise<PixWebhookPayload> {
    const payload = body as Record<string, unknown>;
    const pixArr = payload.pix as Array<Record<string, unknown>> | undefined;
    const pix = pixArr?.[0];
    return {
      txid: String(pix?.txid ?? ''),
      status: 'PAGO',
      paidAt: pix?.horario ? String(pix.horario) : undefined,
      valor: pix?.valor ? Number(pix.valor) : undefined,
      rawPayload: payload,
    };
  }
}
