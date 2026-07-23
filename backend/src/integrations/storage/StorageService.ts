import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { IStorageProvider, UploadOptions, UploadResult } from './IStorageProvider';
import { LocalStorageProvider } from './providers/LocalStorageProvider';
import { S3Provider } from './providers/S3Provider';
import { CloudinaryProvider } from './providers/CloudinaryProvider';

function getProvider(): IStorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case 's3':         return new S3Provider();
    case 'cloudinary': return new CloudinaryProvider();
    case 'local':
    default:           return new LocalStorageProvider();
  }
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_MIMES   = ['application/pdf', 'text/plain', 'application/zip'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE   = 50 * 1024 * 1024; // 50 MB

export class StorageService {
  private provider: IStorageProvider;

  constructor() {
    this.provider = getProvider();
  }

  async uploadImagem(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    meta?: { entidade?: string; entidadeId?: string; campo?: string; userId?: string }
  ): Promise<UploadResult & { id: string }> {
    if (!ALLOWED_IMAGE_MIMES.includes(mimetype)) {
      throw new AppError('Tipo de imagem não permitido. Use JPEG, PNG, WebP ou GIF.', 415);
    }
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new AppError('Imagem muito grande. Máximo: 10 MB.', 413);
    }

    return this.upload(buffer, originalname, mimetype, meta);
  }

  async uploadDocumento(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    meta?: { entidade?: string; entidadeId?: string; campo?: string; userId?: string }
  ): Promise<UploadResult & { id: string }> {
    if (!ALLOWED_DOC_MIMES.includes(mimetype) && !ALLOWED_IMAGE_MIMES.includes(mimetype)) {
      throw new AppError('Tipo de documento não permitido.', 415);
    }
    if (buffer.length > MAX_DOC_SIZE) {
      throw new AppError('Arquivo muito grande. Máximo: 50 MB.', 413);
    }

    return this.upload(buffer, originalname, mimetype, meta);
  }

  async delete(id: string): Promise<void> {
    const file = await prisma.fileUpload.findUnique({ where: { id } });
    if (!file) throw new AppError('Arquivo não encontrado.', 404);

    if (file.path) await this.provider.delete(file.path);
    await prisma.fileUpload.delete({ where: { id } });
  }

  async findAll(params: { entidade?: string; entidadeId?: string; userId?: string }) {
    return prisma.fileUpload.findMany({
      where: {
        ...(params.entidade ? { entidade: params.entidade } : {}),
        ...(params.entidadeId ? { entidadeId: params.entidadeId } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getProviderName(): string { return this.provider.name; }

  private async upload(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    meta?: { entidade?: string; entidadeId?: string; campo?: string; userId?: string }
  ): Promise<UploadResult & { id: string }> {
    const opts: UploadOptions = {
      buffer,
      filename: originalname,
      mimeType: mimetype,
      folder: meta?.entidade ?? 'misc',
      ...meta,
    };

    const result = await this.provider.upload(opts);

    const record = await prisma.fileUpload.create({
      data: {
        userId: meta?.userId,
        entidade: meta?.entidade,
        entidadeId: meta?.entidadeId,
        campo: meta?.campo,
        filename: result.filename,
        mimeType: result.mimeType,
        tamanhoBytes: result.tamanhoBytes,
        provider: result.provider,
        url: result.url,
        path: result.path,
      },
    });

    return { ...result, id: record.id };
  }
}
