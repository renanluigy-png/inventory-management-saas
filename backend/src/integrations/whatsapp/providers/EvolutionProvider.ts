import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { IWhatsAppProvider, MensagemWhatsApp, RespostaMensagem } from '../IWhatsAppProvider';

/**
 * Evolution API — WhatsApp auto-hospedado.
 * Repositório: https://github.com/EvolutionAPI/evolution-api
 *
 * CONFIGURAR:
 *   EVOLUTION_API_URL=https://evolution.suaempresa.com
 *   EVOLUTION_API_KEY=sua-api-key
 *   EVOLUTION_INSTANCE=nome-da-instancia
 */
export class EvolutionProvider implements IWhatsAppProvider {
  readonly name = 'evolution';

  private get baseUrl() {
    const url = env.EVOLUTION_API_URL;
    const instance = env.EVOLUTION_INSTANCE;
    if (!url || !instance || !env.EVOLUTION_API_KEY) {
      throw new AppError('Evolution API não configurada. Defina EVOLUTION_API_URL, EVOLUTION_INSTANCE e EVOLUTION_API_KEY.', 503);
    }
    return `${url}/message`;
  }

  private async post<T>(endpoint: string, body: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${endpoint}/${env.EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { apikey: env.EVOLUTION_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError(`Evolution API error: ${err}`, 502);
    }

    return res.json() as Promise<T>;
  }

  async enviarTexto(destinatario: string, texto: string): Promise<RespostaMensagem> {
    const data = await this.post<{ key: { id: string } }>('sendText', {
      number: destinatario,
      options: { delay: 1200 },
      textMessage: { text: texto },
    });

    return { messageId: data.key?.id ?? '', destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarMidia(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    const endpoint = msg.midia?.tipo === 'document' ? 'sendMedia' : 'sendMedia';
    const data = await this.post<{ key: { id: string } }>(endpoint, {
      number: msg.destinatario,
      options: { delay: 1200 },
      mediaMessage: {
        mediatype: msg.midia?.tipo ?? 'image',
        caption: msg.texto ?? '',
        fileName: msg.midia?.nome,
        media: msg.midia?.url,
      },
    });

    return { messageId: data.key?.id ?? '', destinatario: msg.destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarTemplate(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    // Evolution não usa templates Meta — enviar como texto formatado
    const texto = `${msg.templateId ? `[${msg.templateId}]\n` : ''}${msg.texto ?? JSON.stringify(msg.dados)}`;
    return this.enviarTexto(msg.destinatario, texto);
  }
}
