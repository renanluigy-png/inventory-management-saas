import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { AppError } from '../../utils/AppError';

export type BarcodeType = 'ean13' | 'code128' | 'qrcode' | 'ean8' | 'upca' | 'code39';
export type BarcodeFormat = 'png' | 'svg' | 'base64';

export interface BarcodeOptions {
  type: BarcodeType;
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  includeText?: boolean;
  scale?: number;
}

export interface BarcodeResult {
  type: BarcodeType;
  value: string;
  format: BarcodeFormat;
  data: string;            // base64 ou SVG string
  mimeType: string;
  checkDigit?: string;     // dígito verificador calculado (EAN-13)
}

export class BarcodeService {

  async generate(options: BarcodeOptions): Promise<BarcodeResult> {
    const format = options.format ?? 'base64';

    if (options.type === 'qrcode') {
      return this.generateQRCode(options, format);
    }

    return this.generateLinearBarcode(options, format);
  }

  async generateBatch(codes: Array<{ value: string; type?: BarcodeType }>): Promise<BarcodeResult[]> {
    return Promise.all(
      codes.map((c) =>
        this.generate({ type: c.type ?? 'ean13', value: c.value })
      )
    );
  }

  /** Gera um código EAN-13 com dígito verificador correto. */
  generateEAN13WithDigit(baseCode: string): string {
    const digits = baseCode.replace(/\D/g, '').substring(0, 12).padStart(12, '0');
    const checkDigit = this.calcEAN13CheckDigit(digits);
    return `${digits}${checkDigit}`;
  }

  /** Valida se um EAN-13 é válido. */
  validateEAN13(code: string): boolean {
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 13) return false;
    const base = digits.substring(0, 12);
    const expected = this.calcEAN13CheckDigit(base);
    return digits[12] === expected;
  }

  private async generateQRCode(options: BarcodeOptions, format: BarcodeFormat): Promise<BarcodeResult> {
    let data: string;
    let mimeType: string;

    if (format === 'svg') {
      data = await QRCode.toString(options.value, { type: 'svg', width: options.width ?? 200 });
      mimeType = 'image/svg+xml';
    } else {
      data = await QRCode.toDataURL(options.value, {
        width: options.width ?? 200,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      // Remove prefixo data URI — apenas base64
      data = data.replace('data:image/png;base64,', '');
      mimeType = 'image/png';
    }

    return { type: 'qrcode', value: options.value, format, data, mimeType };
  }

  private async generateLinearBarcode(options: BarcodeOptions, format: BarcodeFormat): Promise<BarcodeResult> {
    let value = options.value;
    let checkDigit: string | undefined;

    // Auto-completa e calcula dígito para EAN-13
    if (options.type === 'ean13') {
      const digits = value.replace(/\D/g, '').substring(0, 12).padStart(12, '0');
      checkDigit = this.calcEAN13CheckDigit(digits);
      value = `${digits}${checkDigit}`;
    }

    const bwipType = this.mapBwipType(options.type);

    const pngBuffer: Buffer = await new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: bwipType,
          text: value,
          scale: options.scale ?? 3,
          height: options.height ?? 10,
          includetext: options.includeText !== false,
          textxalign: 'center',
        },
        (err, png) => {
          if (err) reject(new AppError(`Erro ao gerar código de barras: ${err}`, 500));
          else resolve(png);
        }
      );
    });

    return {
      type: options.type,
      value,
      format: format === 'svg' ? 'base64' : format, // bwip-js só gera PNG
      data: pngBuffer.toString('base64'),
      mimeType: 'image/png',
      checkDigit,
    };
  }

  private mapBwipType(type: BarcodeType): string {
    const map: Record<BarcodeType, string> = {
      ean13:   'ean13',
      ean8:    'ean8',
      code128: 'code128',
      code39:  'code39',
      upca:    'upca',
      qrcode:  'qrcode', // não usado aqui
    };
    return map[type] ?? 'code128';
  }

  private calcEAN13CheckDigit(digits12: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const remainder = sum % 10;
    return String(remainder === 0 ? 0 : 10 - remainder);
  }
}
