import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'currency' | 'date' | 'number' | 'text';
}

export class ExportService {
  async exportToCSV(
    res: Response,
    filename: string,
    columns: ExportColumn[],
    data: Record<string, unknown>[]
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

    const headers = columns.map((c) => `"${c.header}"`).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          return `"${this.formatValue(val, c.format)}"`;
        })
        .join(',')
    );

    res.write('﻿'); // BOM para Excel reconhecer UTF-8
    res.write([headers, ...rows].join('\r\n'));
    res.end();
  }

  async exportToExcel(
    res: Response,
    filename: string,
    columns: ExportColumn[],
    data: Record<string, unknown>[],
    title?: string
  ): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERP SaaS';
    wb.created = new Date();

    const ws = wb.addWorksheet(title ?? 'Dados');

    ws.columns = columns.map((c) => ({
      key: c.key,
      header: c.header,
      width: c.width ?? 18,
    }));

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    for (const row of data) {
      const mapped: Record<string, unknown> = {};
      for (const col of columns) {
        mapped[col.key] = this.formatValue(row[col.key], col.format);
      }
      ws.addRow(mapped);
    }

    ws.eachRow((row, rowNum) => {
      if (rowNum > 1 && rowNum % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  }

  async exportToPDF(
    res: Response,
    filename: string,
    columns: ExportColumn[],
    data: Record<string, unknown>[],
    title?: string,
    subtitle?: string
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text(title ?? filename, { align: 'center' });
    if (subtitle) {
      doc.fontSize(10).font('Helvetica').text(subtitle, { align: 'center' });
    }
    doc.fontSize(8).text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
    doc.moveDown();

    const pageWidth = doc.page.width - 80;
    const colWidth = pageWidth / columns.length;

    // Table header
    const headerY = doc.y;
    doc.rect(40, headerY, pageWidth, 20).fill('#6366F1');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    columns.forEach((col, i) => {
      doc.text(col.header, 40 + i * colWidth + 4, headerY + 5, {
        width: colWidth - 8,
        align: 'left',
      });
    });

    // Table rows
    doc.fillColor('#1F2937').font('Helvetica').fontSize(8);
    let y = headerY + 22;
    for (let ri = 0; ri < data.length; ri++) {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      if (ri % 2 === 1) {
        doc.rect(40, y - 2, pageWidth, 18).fill('#F9FAFB');
        doc.fillColor('#1F2937');
      }
      const row = data[ri];
      columns.forEach((col, ci) => {
        doc.text(String(this.formatValue(row[col.key], col.format) ?? ''), 40 + ci * colWidth + 4, y, {
          width: colWidth - 8,
        });
      });
      y += 18;
    }

    doc.end();
  }

  private formatValue(val: unknown, format?: ExportColumn['format']): string {
    if (val === null || val === undefined) return '';
    switch (format) {
      case 'currency':
        return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      case 'date':
        return val instanceof Date
          ? val.toLocaleDateString('pt-BR')
          : new Date(String(val)).toLocaleDateString('pt-BR');
      case 'number':
        return Number(val).toLocaleString('pt-BR');
      default:
        return String(val);
    }
  }
}
