import PDFDocument from 'pdfkit';
import { DadosCupom, DadosEtiqueta, IPrintProvider, PrintResult } from './IPrintProvider';
import { logger } from '../../utils/logger';

/**
 * Mock/Local print provider.
 * Gera PDF A4 usando PDFKit (pronto para uso).
 * ESC/POS requer integração com biblioteca específica (node-escpos, escpos-usb, etc.)
 * que depende do hardware disponível — implementação via TCPSocket para impressoras de rede.
 */
class LocalPrintProvider implements IPrintProvider {
  readonly name = 'local';

  async imprimirCupom(dados: DadosCupom): Promise<PrintResult> {
    // Em produção: usar node-escpos ou enviar via TCP para impressora de rede
    const cupomText = this.formatCupomText(dados);
    logger.info('[Print] Cupom gerado (ESC/POS não configurado — exibindo no log)');
    logger.debug('[Print Cupom]\n' + cupomText);

    return {
      sucesso: true,
      provider: this.name,
      mensagem: 'Cupom gerado (impressora ESC/POS não configurada — verifique os logs)',
      dados: { text: cupomText },
    };
  }

  async imprimirEtiqueta(dados: DadosEtiqueta): Promise<PrintResult> {
    const etiquetaText = [
      `${dados.nome.substring(0, 30)}`,
      `R$ ${dados.preco.toFixed(2)}`,
      dados.sku ? `SKU: ${dados.sku}` : '',
      dados.codigoBarras ? `CB: ${dados.codigoBarras}` : '',
    ].filter(Boolean).join('\n');

    logger.info('[Print] Etiqueta gerada', { produto: dados.nome });

    return {
      sucesso: true,
      provider: this.name,
      mensagem: 'Etiqueta gerada (impressora não configurada — verifique os logs)',
      dados: { text: etiquetaText },
    };
  }

  async gerarPDFA4(dados: DadosCupom): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(dados.nomeEmpresa, { align: 'center' });
      if (dados.cnpj) doc.fontSize(10).font('Helvetica').text(`CNPJ: ${dados.cnpj}`, { align: 'center' });
      if (dados.endereco) doc.fontSize(10).text(dados.endereco, { align: 'center' });
      if (dados.telefone) doc.fontSize(10).text(`Tel: ${dados.telefone}`, { align: 'center' });

      doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke();

      // Venda info
      doc.moveDown().fontSize(14).font('Helvetica-Bold')
        .text(`COMPROVANTE DE VENDA Nº ${dados.numeroVenda}`, { align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text(`Data: ${dados.data.toLocaleString('pt-BR')}`, { align: 'center' });
      if (dados.nomeCliente) doc.text(`Cliente: ${dados.nomeCliente}`, { align: 'center' });
      doc.text(`Operador: ${dados.operador}`, { align: 'center' });

      doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();

      // Itens
      doc.fontSize(10).font('Helvetica-Bold')
        .text('Produto', 50, doc.y, { continued: true, width: 250 })
        .text('Qtd', 300, doc.y, { continued: true, width: 50, align: 'right' })
        .text('Unit', 350, doc.y, { continued: true, width: 80, align: 'right' })
        .text('Total', 430, doc.y, { width: 115, align: 'right' });

      doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);

      doc.font('Helvetica');
      for (const item of dados.itens) {
        const y = doc.y;
        doc.text(item.nome.substring(0, 35), 50, y, { continued: true, width: 250 })
          .text(String(item.quantidade), 300, y, { continued: true, width: 50, align: 'right' })
          .text(`R$ ${item.precoUnit.toFixed(2)}`, 350, y, { continued: true, width: 80, align: 'right' })
          .text(`R$ ${item.subtotal.toFixed(2)}`, 430, y, { width: 115, align: 'right' });
      }

      doc.moveDown(0.3).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown();

      // Totais
      if (dados.desconto > 0) {
        doc.fontSize(10).text(`Desconto: -R$ ${dados.desconto.toFixed(2)}`, { align: 'right' });
      }
      doc.fontSize(14).font('Helvetica-Bold')
        .text(`TOTAL: R$ ${dados.total.toFixed(2)}`, { align: 'right' });

      if (dados.formaPagamento) {
        doc.fontSize(10).font('Helvetica')
          .text(`Forma de pagamento: ${dados.formaPagamento}`, { align: 'right' });
      }
      if (dados.troco && dados.troco > 0) {
        doc.text(`Troco: R$ ${dados.troco.toFixed(2)}`, { align: 'right' });
      }

      if (dados.rodape) {
        doc.moveDown(2).fontSize(9).font('Helvetica-Oblique').text(dados.rodape, { align: 'center' });
      }

      doc.end();
    });
  }

  private formatCupomText(dados: DadosCupom): string {
    const SEP = '─'.repeat(40);
    const lines = [
      dados.nomeEmpresa.toUpperCase().padStart(20 + Math.floor(dados.nomeEmpresa.length / 2)).substring(0, 40),
      dados.cnpj ? `CNPJ: ${dados.cnpj}`.padStart(24 + Math.floor((`CNPJ: ${dados.cnpj}`).length / 2)).substring(0, 40) : '',
      SEP,
      `VENDA #${dados.numeroVenda}   ${dados.data.toLocaleDateString('pt-BR')} ${dados.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      SEP,
      ...dados.itens.map((i) => [
        i.nome.substring(0, 40),
        `${i.quantidade} x R$ ${i.precoUnit.toFixed(2)}`.padEnd(28) + `R$ ${i.subtotal.toFixed(2)}`.padStart(12),
      ]).flat(),
      SEP,
      dados.desconto > 0 ? `DESCONTO:`.padEnd(28) + `-R$ ${dados.desconto.toFixed(2)}`.padStart(12) : '',
      `TOTAL:`.padEnd(28) + `R$ ${dados.total.toFixed(2)}`.padStart(12),
      dados.formaPagamento ? `PAGAMENTO: ${dados.formaPagamento}` : '',
      dados.troco ? `TROCO: R$ ${dados.troco.toFixed(2)}` : '',
      SEP,
      dados.rodape ?? 'OBRIGADO PELA PREFERÊNCIA!',
      '',
    ].filter(Boolean);

    return lines.join('\n');
  }
}

export class PrintService {
  private provider: IPrintProvider;

  constructor() {
    this.provider = new LocalPrintProvider();
  }

  async imprimirCupom(dados: DadosCupom): Promise<PrintResult> {
    return this.provider.imprimirCupom(dados);
  }

  async imprimirEtiqueta(dados: DadosEtiqueta): Promise<PrintResult> {
    return this.provider.imprimirEtiqueta(dados);
  }

  async gerarPDFA4(dados: DadosCupom): Promise<Buffer> {
    return this.provider.gerarPDFA4(dados);
  }

  getProviderName(): string { return this.provider.name; }
}
