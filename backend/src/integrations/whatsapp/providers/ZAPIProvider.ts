import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { IWhatsAppProvider, MensagemWhatsApp, RespostaMensagem } from '../IWhatsAppProvider';

/**
 * Z-API — WhatsApp como serviço brasileiro.
 * Documentação: https://developer.z-api.io/
 *
 * CONFIGURAR:
 *   ZAPI_INSTANCE_ID=XXXXXXXXXXXX
 *   ZAPI_TOKEN=XXXXXXXXXXXX
 */
export class ZAPIProvider implements IWhatsAppProvider {
  readonly name = 'zapi';

  private get baseUrl() {
    if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN) {
      throw new AppError('Z-API não configurada. Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN.', 503);
    }
    return `https://api.z-api.io/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}`;
  }

  private async post<T>(endpoint: string, body: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new AppError(`Z-API error: ${err.message ?? 'Unknown'}`, 502);
    }

    return res.json() as Promise<T>;
  }

  async enviarTexto(destinatario: string, texto: string): Promise<RespostaMensagem> {
    const data = await this.post<{ zaapId: string }>('send-text', {
      phone: destinatario,
      message: texto,
    });

    return { messageId: data.zaapId ?? '', destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarMidia(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    let endpoint = 'send-image';
    const body: Record<string, unknown> = { phone: msg.destinatario, caption: msg.texto ?? '' };

    switch (msg.midia?.tipo) {
      case 'document':
        endpoint = 'send-document/pdf';
        body.document = msg.midia?.url;
        body.fileName = msg.midia?.nome ?? 'arquivo.pdf';
        break;
      case 'video':
        endpoint = 'send-video';
        body.video = msg.midia?.url;
        break;
      case 'audio':
        endpoint = 'send-audio';
        body.audio = msg.midia?.url;
        break;
      default:
        body.image = msg.midia?.url;
    }

    const data = await this.post<{ zaapId: string }>(endpoint, body);
    return { messageId: data.zaapId ?? '', destinatario: msg.destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarTemplate(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    const texto = `${msg.texto ?? ''}\n${JSON.stringify(msg.dados ?? {})}`;
    return this.enviarTexto(msg.destinatario, texto);
  }
}
