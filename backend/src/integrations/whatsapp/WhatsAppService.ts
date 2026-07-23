import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { IWhatsAppProvider, MensagemWhatsApp, RespostaMensagem } from './IWhatsAppProvider';
import { MockWhatsAppProvider } from './providers/MockWhatsAppProvider';
import { MetaCloudProvider } from './providers/MetaCloudProvider';
import { EvolutionProvider } from './providers/EvolutionProvider';
import { ZAPIProvider } from './providers/ZAPIProvider';
import { logger } from '../../utils/logger';

function getProvider(): IWhatsAppProvider {
  switch (env.WHATSAPP_PROVIDER) {
    case 'meta':      return new MetaCloudProvider();
    case 'evolution': return new EvolutionProvider();
    case 'zapi':      return new ZAPIProvider();
    case 'mock':
    default:          return new MockWhatsAppProvider();
  }
}

export class WhatsAppService {
  private provider: IWhatsAppProvider;

  constructor() {
    this.provider = getProvider();
  }

  async enviarOrcamento(telefone: string, dados: {
    nomeCliente: string;
    numeroVenda: string;
    total: number;
    itens: Array<{ nome: string; quantidade: number; valor: number }>;
  }): Promise<RespostaMensagem> {
    const itensTexto = dados.itens.map((i) =>
      `  • ${i.nome} x${i.quantidade} = R$ ${i.valor.toFixed(2)}`
    ).join('\n');

    const texto = [
      `🛒 *Orçamento #${dados.numeroVenda}*`,
      `Olá, ${dados.nomeCliente}! Segue seu orçamento:`,
      '',
      itensTexto,
      '',
      `*Total: R$ ${dados.total.toFixed(2)}*`,
      '',
      'Para confirmar, responda com *SIM*.',
    ].join('\n');

    return this.provider.enviarTexto(this.normalizePhone(telefone), texto);
  }

  async enviarComprovante(telefone: string, dados: {
    nomeCliente: string;
    numeroVenda: string;
    total: number;
    formaPagamento: string;
    pdfUrl?: string;
  }): Promise<RespostaMensagem> {
    const texto = [
      `✅ *Comprovante de Pagamento*`,
      `Venda #${dados.numeroVenda}`,
      `Cliente: ${dados.nomeCliente}`,
      `Forma de pagamento: ${dados.formaPagamento}`,
      `*Total pago: R$ ${dados.total.toFixed(2)}*`,
      '',
      'Obrigado pela preferência! 🙏',
    ].join('\n');

    if (dados.pdfUrl) {
      return this.provider.enviarMidia({
        tipo: 'comprovante',
        destinatario: this.normalizePhone(telefone),
        texto,
        midia: { url: dados.pdfUrl, tipo: 'document', nome: `comprovante-${dados.numeroVenda}.pdf` },
      });
    }

    return this.provider.enviarTexto(this.normalizePhone(telefone), texto);
  }

  async enviarNotaFiscal(telefone: string, dados: {
    nomeCliente: string;
    chaveAcesso: string;
    xmlUrl?: string;
    pdfUrl?: string;
  }): Promise<RespostaMensagem> {
    const texto = [
      `🧾 *Nota Fiscal Eletrônica*`,
      `Olá, ${dados.nomeCliente}!`,
      `Sua nota fiscal foi emitida com sucesso.`,
      '',
      `Chave de acesso:`,
      `\`${dados.chaveAcesso}\``,
    ].join('\n');

    if (dados.pdfUrl) {
      return this.provider.enviarMidia({
        tipo: 'nota_fiscal',
        destinatario: this.normalizePhone(telefone),
        texto,
        midia: { url: dados.pdfUrl, tipo: 'document', nome: 'nota-fiscal.pdf' },
      });
    }

    return this.provider.enviarTexto(this.normalizePhone(telefone), texto);
  }

  async enviarPromocao(telefones: string[], dados: {
    nomePromocao: string;
    descricao: string;
    desconto: string;
    validade: string;
    imagemUrl?: string;
  }): Promise<RespostaMensagem[]> {
    const texto = [
      `🎁 *${dados.nomePromocao}*`,
      dados.descricao,
      '',
      `💰 Desconto: *${dados.desconto}*`,
      `📅 Válido até: ${dados.validade}`,
      '',
      'Aproveite! 🛍️',
    ].join('\n');

    const results = await Promise.allSettled(
      telefones.map((tel) => {
        const phone = this.normalizePhone(tel);
        if (dados.imagemUrl) {
          return this.provider.enviarMidia({
            tipo: 'promocao',
            destinatario: phone,
            texto,
            midia: { url: dados.imagemUrl, tipo: 'image' },
          });
        }
        return this.provider.enviarTexto(phone, texto);
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      logger.error(`[WhatsApp] Falha ao enviar para ${telefones[i]}`, r.reason);
      return { messageId: '', destinatario: telefones[i], status: 'erro' as const, timestamp: new Date(), erro: String(r.reason) };
    });
  }

  async enviarAvisoEstoque(telefone: string, dados: {
    nomeProduto: string;
    estoqueAtual: number;
    estoqueMinimo: number;
  }): Promise<RespostaMensagem> {
    const texto = [
      `⚠️ *Alerta de Estoque Crítico*`,
      `Produto: *${dados.nomeProduto}*`,
      `Estoque atual: ${dados.estoqueAtual} unidades`,
      `Estoque mínimo: ${dados.estoqueMinimo} unidades`,
      '',
      'Providencie reposição o quanto antes.',
    ].join('\n');

    return this.provider.enviarTexto(this.normalizePhone(telefone), texto);
  }

  async enviarCobranca(telefone: string, dados: {
    nomeCliente: string;
    valorDevido: number;
    vencimento: string;
    pixQrCode?: string;
  }): Promise<RespostaMensagem> {
    const texto = [
      `💳 *Lembrete de Pagamento*`,
      `Olá, ${dados.nomeCliente}!`,
      '',
      `Valor em aberto: *R$ ${dados.valorDevido.toFixed(2)}*`,
      `Vencimento: ${dados.vencimento}`,
      '',
      dados.pixQrCode ? `PIX (copia e cola):\n\`${dados.pixQrCode.substring(0, 50)}...\`` : '',
      '',
      'Em caso de dúvidas, entre em contato conosco.',
    ].filter(Boolean).join('\n');

    return this.provider.enviarTexto(this.normalizePhone(telefone), texto);
  }

  async enviarTextoLivre(telefone: string, mensagem: string): Promise<RespostaMensagem> {
    return this.provider.enviarTexto(this.normalizePhone(telefone), mensagem);
  }

  getProviderName(): string {
    return this.provider.name;
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) return `+${digits}`;
    if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
    return `+${digits}`;
  }
}
