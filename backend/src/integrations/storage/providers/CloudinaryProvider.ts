import crypto from 'crypto';
import path from 'path';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { IStorageProvider, UploadOptions, UploadResult } from '../IStorageProvider';

/**
 * Cloudinary Storage Provider.
 * Documentação: https://cloudinary.com/documentation/image_upload_api_reference
 *
 * CONFIGURAR:
 *   STORAGE_PROVIDER=cloudinary
 *   CLOUDINARY_CLOUD_NAME=meu-cloud
 *   CLOUDINARY_API_KEY=123456789012345
 *   CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxx
 */
export class CloudinaryProvider implements IStorageProvider {
  readonly name = 'cloudinary';

  private ensureConfig() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError(
        'Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env.',
        503
      );
    }
  }

  private get uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`;
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    this.ensureConfig();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = options.folder ?? options.entidade ?? 'erp';
    const publicId = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Gera assinatura HMAC-SHA1 para autenticação
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha1', env.CLOUDINARY_API_SECRET!)
      .update(paramsToSign)
      .digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(options.buffer)], { type: options.mimeType }), options.filename);
    formData.append('api_key', env.CLOUDINARY_API_KEY!);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);
    formData.append('public_id', path.basename(publicId));

    const res = await fetch(this.uploadUrl, { method: 'POST', body: formData });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message: string } };
      throw new AppError(`Cloudinary upload falhou: ${err.error?.message ?? res.statusText}`, 502);
    }

    const data = await res.json() as { secure_url: string; public_id: string; bytes: number };

    return {
      url: data.secure_url,
      path: data.public_id,
      provider: this.name,
      filename: options.filename,
      mimeType: options.mimeType,
      tamanhoBytes: data.bytes,
    };
  }

  async delete(publicId: string): Promise<void> {
    this.ensureConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha1', env.CLOUDINARY_API_SECRET!)
      .update(`public_id=${publicId}&timestamp=${timestamp}`)
      .digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', env.CLOUDINARY_API_KEY!);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: 'POST', body: formData }
    );
  }

  getUrl(publicId: string): string {
    return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
  }
}
