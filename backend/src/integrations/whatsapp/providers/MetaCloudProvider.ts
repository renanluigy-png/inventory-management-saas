import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { IWhatsAppProvider, MensagemWhatsApp, RespostaMensagem } from '../IWhatsAppProvider';

/**
 * Meta Business Platform — WhatsApp Cloud API.
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * CONFIGURAR:
 *   WHATSAPP_META_TOKEN=EAAB...xxxxxx (token de acesso permanente)
 *   WHATSAPP_META_PHONE_ID=123456789012345 (ID do número de telefone)
 */
export class MetaCloudProvider implements IWhatsAppProvider {
  readonly name = 'meta';
  private get baseUrl() { return `https://graph.facebook.com/v21.0/${env.WHATSAPP_META_PHONE_ID}/messages`; }

  private getToken(): string {
    if (!env.WHATSAPP_META_TOKEN || !env.WHATSAPP_META_PHONE_ID) {
      throw new AppError('Meta Cloud API não configurada. Defina WHATSAPP_META_TOKEN e WHATSAPP_META_PHONE_ID.', 503);
    }
    return env.WHATSAPP_META_TOKEN;
  }

  private async send(payload: object): Promise<RespostaMensagem> {
    const token = this.getToken();
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message: string } };
      throw new AppError(`Meta WhatsApp error: ${err.error?.message ?? 'Unknown'}`, 502);
    }

    const data = await res.json() as { messages: Array<{ id: string }> };
    return {
      messageId: data.messages?.[0]?.id ?? '',
      destinatario: (payload as Record<string, unknown>).to as string,
      status: 'enviado',
      timestamp: new Date(),
    };
  }

  async enviarTexto(destinatario: string, texto: string): Promise<RespostaMensagem> {
    return this.send({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destinatario,
      type: 'text',
      text: { preview_url: false, body: texto },
    });
  }

  async enviarMidia(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    return this.send({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: msg.destinatario,
      type: msg.midia?.tipo ?? 'image',
      [msg.midia?.tipo ?? 'image']: {
        link: msg.midia?.url,
        caption: msg.texto ?? '',
        filename: msg.midia?.nome,
      },
    });
  }

  async enviarTemplate(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    return this.send({
      messaging_product: 'whatsapp',
      to: msg.destinatario,
      type: 'template',
      template: {
        name: msg.templateId,
        language: { code: 'pt_BR' },
        components: msg.dados
          ? [{ type: 'body', parameters: Object.values(msg.dados).map((v) => ({ type: 'text', text: String(v) })) }]
          : [],
      },
    });
  }
}
