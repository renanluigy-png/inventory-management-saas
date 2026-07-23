import crypto from 'crypto';
import { IWhatsAppProvider, MensagemWhatsApp, RespostaMensagem } from '../IWhatsAppProvider';
import { logger } from '../../../utils/logger';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  readonly name = 'mock';

  async enviarTexto(destinatario: string, texto: string): Promise<RespostaMensagem> {
    const messageId = `MOCK_MSG_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    logger.info(`[WhatsApp Mock] → ${destinatario}: ${texto.substring(0, 80)}...`);
    return { messageId, destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarMidia(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    const messageId = `MOCK_MEDIA_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    logger.info(`[WhatsApp Mock] Mídia → ${msg.destinatario} | tipo: ${msg.midia?.tipo} | url: ${msg.midia?.url}`);
    return { messageId, destinatario: msg.destinatario, status: 'enviado', timestamp: new Date() };
  }

  async enviarTemplate(msg: MensagemWhatsApp): Promise<RespostaMensagem> {
    const messageId = `MOCK_TPL_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    logger.info(`[WhatsApp Mock] Template "${msg.templateId}" → ${msg.destinatario}`, msg.dados);
    return { messageId, destinatario: msg.destinatario, status: 'enviado', timestamp: new Date() };
  }
}
