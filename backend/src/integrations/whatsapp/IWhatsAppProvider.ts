export type TipoMensagemWhatsApp =
  | 'orcamento'
  | 'comprovante'
  | 'nota_fiscal'
  | 'promocao'
  | 'aviso_estoque'
  | 'cobranca'
  | 'texto_livre';

export interface MensagemWhatsApp {
  tipo: TipoMensagemWhatsApp;
  destinatario: string;   // número com DDI: +5511999999999
  texto?: string;         // para texto_livre ou complemento
  dados?: Record<string, unknown>; // dados do template
  midia?: {
    url: string;          // URL pública do arquivo
    tipo: 'image' | 'document' | 'audio' | 'video';
    nome?: string;        // nome do arquivo para documentos
  };
  templateId?: string;    // ID de template pré-aprovado (Meta)
}

export interface RespostaMensagem {
  messageId: string;
  destinatario: string;
  status: 'enviado' | 'erro';
  timestamp: Date;
  erro?: string;
}

export interface IWhatsAppProvider {
  readonly name: string;

  /** Envia uma mensagem de texto simples. */
  enviarTexto(destinatario: string, texto: string): Promise<RespostaMensagem>;

  /** Envia uma mensagem com mídia (imagem, PDF). */
  enviarMidia(msg: MensagemWhatsApp): Promise<RespostaMensagem>;

  /** Envia uma mensagem usando template aprovado. */
  enviarTemplate(msg: MensagemWhatsApp): Promise<RespostaMensagem>;
}
