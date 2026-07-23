import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { ReportRepository, FinancialReportParams } from '../repositories/ReportRepository';
import { FormaPagamento } from '@prisma/client';

export class ReportService {
  private reportRepository: ReportRepository;

  constructor() {
    this.reportRepository = new ReportRepository();
  }

  // ----------------------------------------------------------------
  // Relatórios (dados estruturados)
  // ----------------------------------------------------------------

  /** Relatório financeiro com resumo e lista paginada de vendas. */
  async getFinancialReport(params: FinancialReportParams) {
    return this.reportRepository.getFinancialReport(params);
  }

  /** Relatório de estoque com valores e status por produto. */
  async getInventoryReport(params: {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    orderBy?: 'nome' | 'estoque' | 'preco' | 'createdAt';
    order?: 'asc' | 'desc';
  }) {
    return this.reportRepository.getInventoryReport(params);
  }

  // ----------------------------------------------------------------
  // Exportação PDF
  // ----------------------------------------------------------------

  /** Gera e envia o relatório financeiro em PDF diretamente para o Response. */
  async exportFinancialPDF(params: FinancialReportParams, res: Response): Promise<void> {
    const report = await this.reportRepository.getFinancialReport({
      ...params,
      limit: 1000, // exportação sem limite de paginação
      page: 1,
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-financeiro-${this.dateStamp()}.pdf"`
    );
    doc.pipe(res);

    // ── Cabeçalho ──────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').text('Relatório Financeiro', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1.5);

    // ── Resumo ─────────────────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold').text('Resumo');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    const r = report.resumo;
    const summaryLines = [
      ['Total Vendido', this.currency(r.totalVendido)],
      ['Lucro Estimado', this.currency(r.lucro)],
      ['Descontos Concedidos', this.currency(r.totalDescontos)],
      ['Quantidade de Vendas', String(r.quantidadeVendas)],
      ['Ticket Médio', this.currency(r.ticketMedio)],
    ];

    doc.fontSize(10).font('Helvetica');
    summaryLines.forEach(([label, value]) => {
      doc.text(`${label}:`, 50, doc.y, { continued: true, width: 200 });
      doc.text(value, { align: 'right' });
    });

    doc.moveDown(1.5);

    // ── Breakdown por forma de pagamento ───────────────────────
    if (report.porFormaPagamento.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').text('Por Forma de Pagamento');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.4);

      this.pdfTableHeader(doc, ['Forma de Pagamento', 'Qtd. Vendas', 'Total'], [200, 100, 195]);
      report.porFormaPagamento.forEach((b) => {
        this.pdfTableRow(doc, [
          b.formaPagamento ?? '—',
          String(b.quantidade),
          this.currency(b.totalVendido),
        ], [200, 100, 195]);
      });
      doc.moveDown(1);
    }

    // ── Lista de vendas ────────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold').text('Vendas');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    this.pdfTableHeader(doc, ['Nº', 'Data', 'Cliente', 'Pagamento', 'Total'], [40, 80, 160, 100, 60]);
    for (const v of report.vendas) {
      if (doc.y > 720) doc.addPage();
      this.pdfTableRow(doc, [
        String(v.numero),
        new Date(v.createdAt).toLocaleDateString('pt-BR'),
        v.customer?.nome ?? 'Consumidor',
        v.formaPagamento ?? '—',
        this.currency(Number(v.total) - Number(v.desconto)),
      ], [40, 80, 160, 100, 60]);
    }

    doc.end();
  }

  /** Gera e envia o relatório de estoque em PDF diretamente para o Response. */
  async exportInventoryPDF(
    params: Parameters<ReportService['getInventoryReport']>[0],
    res: Response
  ): Promise<void> {
    const report = await this.reportRepository.getInventoryReport({ ...params, limit: 1000, page: 1 });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-estoque-${this.dateStamp()}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Relatório de Estoque', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(13).font('Helvetica-Bold').text('Resumo');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    const rm = report.resumo;
    const summaryLines = [
      ['Produtos Ativos', String(rm.totalProdutosAtivos)],
      ['Produtos Sem Estoque', String(rm.produtosSemEstoque)],
      ['Produtos Abaixo do Mínimo', String(rm.produtosEstoqueBaixo)],
      ['Valor Investido (Custo)', this.currency(rm.valorInvestido)],
      ['Valor de Venda (Estoque)', this.currency(rm.valorVenda)],
      ['Lucro Potencial', this.currency(rm.lucroPotencial)],
    ];
    doc.fontSize(10).font('Helvetica');
    summaryLines.forEach(([label, value]) => {
      doc.text(`${label}:`, 50, doc.y, { continued: true, width: 270 });
      doc.text(value, { align: 'right' });
    });

    doc.moveDown(1.5);
    doc.fontSize(13).font('Helvetica-Bold').text('Produtos');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    this.pdfTableHeader(doc, ['SKU', 'Nome', 'Estoque', 'Mín.', 'Preço', 'Status'], [70, 190, 50, 40, 70, 65]);
    for (const p of report.produtos) {
      if (doc.y > 720) doc.addPage();
      this.pdfTableRow(doc, [
        p.sku ?? '—',
        p.nome,
        String(p.estoque),
        String(p.estoqueMinimo),
        this.currency(Number(p.preco)),
        (p as any).statusEstoque,
      ], [70, 190, 50, 40, 70, 65]);
    }

    doc.end();
  }

  // ----------------------------------------------------------------
  // Exportação Excel
  // ----------------------------------------------------------------

  /** Gera e envia o relatório financeiro em Excel (XLSX) para o Response. */
  async exportFinancialExcel(params: FinancialReportParams, res: Response): Promise<void> {
    const report = await this.reportRepository.getFinancialReport({
      ...params,
      limit: 10000,
      page: 1,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP Controle de Estoque';
    workbook.created = new Date();

    // ── Aba Resumo ─────────────────────────────────────────────
    const sheetResumo = workbook.addWorksheet('Resumo');
    this.excelTitle(sheetResumo, 'Relatório Financeiro');
    sheetResumo.addRow(['']);
    sheetResumo.addRow(['Métrica', 'Valor']);
    const r = report.resumo;
    [
      ['Total Vendido', r.totalVendido],
      ['Lucro Estimado', r.lucro],
      ['Descontos', r.totalDescontos],
      ['Qtd. Vendas', r.quantidadeVendas],
      ['Ticket Médio', r.ticketMedio],
    ].forEach(([k, v]) => sheetResumo.addRow([k, v]));

    sheetResumo.addRow(['']);
    sheetResumo.addRow(['Por Forma de Pagamento', '', '']);
    sheetResumo.addRow(['Forma', 'Qtd.', 'Total']);
    report.porFormaPagamento.forEach((b) =>
      sheetResumo.addRow([b.formaPagamento, b.quantidade, b.totalVendido])
    );

    sheetResumo.getColumn(1).width = 28;
    sheetResumo.getColumn(2).width = 16;

    // ── Aba Vendas ─────────────────────────────────────────────
    const sheetVendas = workbook.addWorksheet('Vendas');
    sheetVendas.columns = [
      { header: 'Nº Venda',      key: 'numero',         width: 10 },
      { header: 'Data',          key: 'data',           width: 14 },
      { header: 'Cliente',       key: 'cliente',        width: 28 },
      { header: 'Usuário',       key: 'usuario',        width: 18 },
      { header: 'Pagamento',     key: 'pagamento',      width: 16 },
      { header: 'Total Bruto',   key: 'totalBruto',     width: 14 },
      { header: 'Desconto',      key: 'desconto',       width: 12 },
      { header: 'Total Líquido', key: 'totalLiquido',   width: 14 },
      { header: 'Itens',         key: 'itens',          width: 8  },
    ];
    this.excelBoldRow(sheetVendas, 1);

    for (const v of report.vendas) {
      sheetVendas.addRow({
        numero:       v.numero,
        data:         new Date(v.createdAt).toLocaleDateString('pt-BR'),
        cliente:      v.customer?.nome ?? 'Consumidor',
        usuario:      v.user.nome,
        pagamento:    v.formaPagamento ?? '—',
        totalBruto:   Number(v.total),
        desconto:     Number(v.desconto),
        totalLiquido: Number(v.total) - Number(v.desconto),
        itens:        v.itens.length,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-financeiro-${this.dateStamp()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /** Gera e envia o relatório de estoque em Excel (XLSX) para o Response. */
  async exportInventoryExcel(
    params: Parameters<ReportService['getInventoryReport']>[0],
    res: Response
  ): Promise<void> {
    const report = await this.reportRepository.getInventoryReport({ ...params, limit: 10000, page: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP Controle de Estoque';
    workbook.created = new Date();

    // ── Aba Resumo ─────────────────────────────────────────────
    const sheetResumo = workbook.addWorksheet('Resumo');
    this.excelTitle(sheetResumo, 'Relatório de Estoque');
    sheetResumo.addRow(['']);
    sheetResumo.addRow(['Métrica', 'Valor']);
    const rm = report.resumo;
    [
      ['Produtos Ativos', rm.totalProdutosAtivos],
      ['Sem Estoque', rm.produtosSemEstoque],
      ['Estoque Baixo', rm.produtosEstoqueBaixo],
      ['Valor Investido', rm.valorInvestido],
      ['Valor de Venda', rm.valorVenda],
      ['Lucro Potencial', rm.lucroPotencial],
    ].forEach(([k, v]) => sheetResumo.addRow([k, v]));
    sheetResumo.getColumn(1).width = 22;
    sheetResumo.getColumn(2).width = 18;

    // ── Aba Produtos ───────────────────────────────────────────
    const sheetProd = workbook.addWorksheet('Produtos');
    sheetProd.columns = [
      { header: 'SKU',             key: 'sku',             width: 16 },
      { header: 'Nome',            key: 'nome',            width: 36 },
      { header: 'Categoria',       key: 'categoria',       width: 18 },
      { header: 'Estoque',         key: 'estoque',         width: 10 },
      { header: 'Est. Mínimo',     key: 'estoqueMinimo',   width: 12 },
      { header: 'Unidade',         key: 'unidade',         width: 10 },
      { header: 'Preço Venda',     key: 'preco',           width: 14 },
      { header: 'Custo',           key: 'precoCusto',      width: 12 },
      { header: 'Margem %',        key: 'margem',          width: 10 },
      { header: 'Vlr. Estoque',    key: 'valorEstoque',    width: 14 },
      { header: 'Status',          key: 'status',          width: 10 },
    ];
    this.excelBoldRow(sheetProd, 1);

    for (const p of report.produtos) {
      sheetProd.addRow({
        sku:           p.sku ?? '—',
        nome:          p.nome,
        categoria:     (p as any).category?.nome ?? '—',
        estoque:       p.estoque,
        estoqueMinimo: p.estoqueMinimo,
        unidade:       p.unidade,
        preco:         Number(p.preco),
        precoCusto:    p.precoCusto !== null ? Number(p.precoCusto) : null,
        margem:        (p as any).margemPercent,
        valorEstoque:  Number(p.preco) * p.estoque,
        status:        (p as any).statusEstoque,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-estoque-${this.dateStamp()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ----------------------------------------------------------------
  // Exportação CSV
  // ----------------------------------------------------------------

  /** Gera e envia o relatório financeiro em CSV para o Response. */
  async exportFinancialCSV(params: FinancialReportParams, res: Response): Promise<void> {
    const report = await this.reportRepository.getFinancialReport({
      ...params,
      limit: 50000,
      page: 1,
    });

    const rows: string[][] = [
      ['Nº Venda', 'Data', 'Cliente', 'Usuário', 'Pagamento', 'Total Bruto', 'Desconto', 'Total Líquido', 'Qtd Itens'],
    ];

    for (const v of report.vendas) {
      rows.push([
        String(v.numero),
        new Date(v.createdAt).toLocaleDateString('pt-BR'),
        v.customer?.nome ?? 'Consumidor',
        v.user.nome,
        v.formaPagamento ?? '—',
        String(Number(v.total).toFixed(2)),
        String(Number(v.desconto).toFixed(2)),
        String((Number(v.total) - Number(v.desconto)).toFixed(2)),
        String(v.itens.length),
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-financeiro-${this.dateStamp()}.csv"`);
    res.send('﻿' + csv); // BOM para Excel reconhecer UTF-8
  }

  /** Gera e envia o relatório de estoque em CSV para o Response. */
  async exportInventoryCSV(
    params: Parameters<ReportService['getInventoryReport']>[0],
    res: Response
  ): Promise<void> {
    const report = await this.reportRepository.getInventoryReport({ ...params, limit: 50000, page: 1 });

    const rows: string[][] = [
      ['SKU', 'Nome', 'Categoria', 'Estoque', 'Est. Mínimo', 'Unidade', 'Preço Venda', 'Custo', 'Margem %', 'Valor Estoque', 'Status'],
    ];

    for (const p of report.produtos) {
      rows.push([
        p.sku ?? '—',
        p.nome,
        (p as any).category?.nome ?? '—',
        String(p.estoque),
        String(p.estoqueMinimo),
        p.unidade,
        String(Number(p.preco).toFixed(2)),
        p.precoCusto !== null ? String(Number(p.precoCusto).toFixed(2)) : '—',
        String((p as any).margemPercent ?? '—'),
        String((Number(p.preco) * p.estoque).toFixed(2)),
        (p as any).statusEstoque ?? '—',
      ]);
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-estoque-${this.dateStamp()}.csv"`);
    res.send('﻿' + csv);
  }

  // ----------------------------------------------------------------
  // Helpers privados de formatação
  // ----------------------------------------------------------------

  private currency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private pdfTableHeader(doc: PDFKit.PDFDocument, headers: string[], widths: number[]): void {
    doc.fontSize(9).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((h, i) => {
      doc.text(h, x, doc.y, { width: widths[i], lineBreak: false });
      x += widths[i];
    });
    doc.moveDown(0.6);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
  }

  private pdfTableRow(doc: PDFKit.PDFDocument, cols: string[], widths: number[]): void {
    doc.fontSize(8).font('Helvetica');
    const y = doc.y;
    let x = 50;
    cols.forEach((c, i) => {
      doc.text(c, x, y, { width: widths[i], lineBreak: false });
      x += widths[i];
    });
    doc.moveDown(0.5);
  }

  private excelTitle(sheet: ExcelJS.Worksheet, title: string): void {
    const row = sheet.addRow([title]);
    row.font = { bold: true, size: 14 };
  }

  private excelBoldRow(sheet: ExcelJS.Worksheet, rowNumber: number): void {
    const row = sheet.getRow(rowNumber);
    row.font = { bold: true };
    row.commit();
  }
}
