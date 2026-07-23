import crypto from 'crypto';
import path from 'path';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { IStorageProvider, UploadOptions, UploadResult } from '../IStorageProvider';

/**
 * Amazon S3 Storage Provider.
 * Usa a AWS REST API diretamente via Fetch (sem @aws-sdk para manter dependências mínimas).
 * Para produção recomendamos instalar @aws-sdk/client-s3 e substituir este provider.
 *
 * CONFIGURAR:
 *   STORAGE_PROVIDER=s3
 *   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
 *   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
 *   AWS_S3_BUCKET=meu-bucket
 *   AWS_S3_REGION=us-east-1
 */
export class S3Provider implements IStorageProvider {
  readonly name = 's3';

  private ensureConfig() {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
      throw new AppError(
        'S3 não configurado. Defina AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AWS_S3_BUCKET no .env.',
        503
      );
    }
  }

  private get bucketUrl() {
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_S3_REGION}.amazonaws.com`;
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    this.ensureConfig();

    const folder = options.folder ?? options.entidade ?? 'misc';
    const ext = path.extname(options.filename).toLowerCase() || '.bin';
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

    const amzDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const contentMd5 = crypto.createHash('md5').update(options.buffer).digest('base64');

    // Em produção, use @aws-sdk/client-s3 com Signature V4 completo.
    // Esta implementação é simplificada para fins de integração.
    const res = await fetch(`${this.bucketUrl}/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': options.mimeType,
        'Content-Length': String(options.buffer.length),
        'Content-MD5': contentMd5,
        'x-amz-date': amzDate,
        'x-amz-acl': 'public-read',
        // Authorization header seria calculado com HMAC-SHA256 da Sig V4
        // Substituir por @aws-sdk/client-s3 em produção
        Authorization: `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${dateStamp}/${env.AWS_S3_REGION}/s3/aws4_request, [PLACEHOLDER — use @aws-sdk/client-s3]`,
      },
      body: new Uint8Array(options.buffer),
    });

    if (!res.ok) {
      throw new AppError(`S3 upload falhou: ${res.status} ${res.statusText}`, 502);
    }

    const url = `${this.bucketUrl}/${key}`;
    return { url, path: key, provider: this.name, filename: key, mimeType: options.mimeType, tamanhoBytes: options.buffer.length };
  }

  async delete(key: string): Promise<void> {
    this.ensureConfig();
    await fetch(`${this.bucketUrl}/${key}`, { method: 'DELETE' });
  }

  getUrl(key: string): string {
    return `${this.bucketUrl}/${key}`;
  }
}
