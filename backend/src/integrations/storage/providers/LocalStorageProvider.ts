import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IStorageProvider, UploadOptions, UploadResult } from '../IStorageProvider';
import { env } from '../../../config/env';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local';

  async upload(options: UploadOptions): Promise<UploadResult> {
    const folder = options.folder ?? options.entidade ?? 'misc';
    const destDir = path.join(UPLOADS_ROOT, folder);

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const ext = path.extname(options.filename).toLowerCase() || '.bin';
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(destDir, unique);

    fs.writeFileSync(filePath, options.buffer);

    const relativePath = path.join(folder, unique).replace(/\\/g, '/');
    const url = `${env.FRONTEND_URL.replace('5173', '3333')}/uploads/${relativePath}`;

    return {
      url,
      path: relativePath,
      provider: this.name,
      filename: unique,
      mimeType: options.mimeType,
      tamanhoBytes: options.buffer.length,
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_ROOT, filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  getUrl(filePath: string): string {
    return `${env.FRONTEND_URL.replace('5173', '3333')}/uploads/${filePath}`;
  }
}
