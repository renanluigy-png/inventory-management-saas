export interface UploadOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;       // subpasta/prefixo
  entidade?: string;     // products, settings, etc.
  entidadeId?: string;
  campo?: string;        // imagemUrl, logoUrl, etc.
}

export interface UploadResult {
  url: string;           // URL pública de acesso
  path: string;          // caminho interno no storage
  provider: string;
  filename: string;
  mimeType: string;
  tamanhoBytes: number;
}

export interface IStorageProvider {
  readonly name: string;

  /** Faz o upload de um arquivo e retorna a URL pública. */
  upload(options: UploadOptions): Promise<UploadResult>;

  /** Remove um arquivo pelo path interno. */
  delete(path: string): Promise<void>;

  /** Retorna a URL pública de um arquivo pelo path. */
  getUrl(path: string): string;
}
