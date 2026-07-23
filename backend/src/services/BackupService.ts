import archiver from 'archiver';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export type BackupType = 'full' | 'database' | 'uploads' | 'settings';

export class BackupService {
  constructor() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // ----------------------------------------------------------------
  // Criação de backup
  // ----------------------------------------------------------------

  /** Cria um arquivo ZIP com o backup e retorna o nome do arquivo gerado. */
  async createBackup(type: BackupType): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type}-${timestamp}.zip`;
    const filePath = path.join(BACKUP_DIR, filename);

    const includeDatabase = type === 'full' || type === 'database' || type === 'settings';
    const includeUploads = type === 'full' || type === 'uploads';
    const onlySettings = type === 'settings';

    // Exporta dados do banco antes de abrir o stream do arquivo
    const exportData = includeDatabase ? await this.exportDatabase(onlySettings) : null;

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      // JSON do banco
      if (exportData) {
        archive.append(JSON.stringify(exportData, null, 2), {
          name: onlySettings ? 'settings.json' : 'database.json',
        });
      }

      // Arquivos de upload
      if (includeUploads && fs.existsSync(UPLOADS_DIR)) {
        archive.directory(UPLOADS_DIR, 'uploads');
      }

      // Manifesto do backup
      archive.append(
        JSON.stringify({
          versao: '1.0.0',
          tipo: type,
          criadoEm: new Date().toISOString(),
          tabelas: exportData ? Object.keys(exportData) : [],
        }, null, 2),
        { name: 'manifest.json' }
      );

      archive.finalize();
    });

    logger.info(`Backup criado: ${filename}`);
    return filename;
  }

  // ----------------------------------------------------------------
  // Download
  // ----------------------------------------------------------------

  /** Retorna o stream de um arquivo de backup existente. */
  getBackupStream(filename: string): fs.ReadStream {
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo de backup não encontrado: ${filename}`);
    }
    return fs.createReadStream(filePath);
  }

  /** Lista backups existentes no diretório. */
  listBackups(): Array<{ filename: string; tamanhoMB: number; criadoEm: Date }> {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.zip'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          tamanhoMB: Math.round((stat.size / 1024 / 1024) * 100) / 100,
          criadoEm: stat.birthtime,
        };
      })
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }

  // ----------------------------------------------------------------
  // Restore
  // ----------------------------------------------------------------

  /** Lê o manifesto de um arquivo ZIP de backup e retorna metadados. */
  async inspectBackup(zipBuffer: Buffer): Promise<{
    manifesto: Record<string, unknown>;
    tamanhoMB: number;
    tabelas: string[];
    temUploads: boolean;
  }> {
    const zip = new AdmZip(zipBuffer);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) throw new Error('Arquivo ZIP inválido: manifest.json ausente.');

    const manifesto = JSON.parse(manifestEntry.getData().toString('utf-8')) as Record<string, unknown>;
    const tabelas = (manifesto.tabelas as string[]) ?? [];
    const temUploads = zip.getEntries().some((e) => e.entryName.startsWith('uploads/'));
    const tamanhoMB = Math.round((zipBuffer.length / 1024 / 1024) * 100) / 100;

    return { manifesto, tamanhoMB, tabelas, temUploads };
  }

  /** Restaura os dados do banco a partir de um buffer ZIP. Use apenas com confirm=true. */
  async restoreDatabase(zipBuffer: Buffer): Promise<{ tabelasRestauradas: string[]; totalRegistros: number }> {
    const zip = new AdmZip(zipBuffer);
    const dbEntry = zip.getEntry('database.json') ?? zip.getEntry('settings.json');
    if (!dbEntry) throw new Error('Nenhum arquivo de dados (database.json ou settings.json) encontrado no backup.');

    const data = JSON.parse(dbEntry.getData().toString('utf-8')) as Record<string, unknown[]>;
    const tabelasRestauradas: string[] = [];
    let totalRegistros = 0;

    // Ordem de restauração respeita as chaves estrangeiras
    const ordemRestore: Array<keyof typeof prismaTableMap> = [
      'systemSettings', 'users', 'categories', 'products',
      'customers', 'caixas', 'sales', 'saleItems',
      'caixaMovimentacoes', 'movimentacoesEstoque',
    ];

    const prismaTableMap = {
      systemSettings: prisma.systemSettings,
      users: prisma.user,
      categories: prisma.category,
      products: prisma.product,
      customers: prisma.customer,
      caixas: prisma.caixa,
      sales: prisma.sale,
      saleItems: prisma.saleItem,
      caixaMovimentacoes: prisma.caixaMovimentacao,
      movimentacoesEstoque: prisma.movimentacaoEstoque,
    } as const;

    for (const tabela of ordemRestore) {
      if (!data[tabela] || !Array.isArray(data[tabela]) || data[tabela].length === 0) continue;

      const model = prismaTableMap[tabela] as unknown as {
        upsert: (args: { where: { id: string }; update: unknown; create: unknown }) => Promise<unknown>;
      };

      for (const record of data[tabela] as Array<{ id: string }>) {
        await model.upsert({
          where: { id: record.id },
          update: record,
          create: record,
        }).catch(() => {}); // ignora conflito de FK em registros órfãos
      }

      tabelasRestauradas.push(tabela);
      totalRegistros += data[tabela].length;
    }

    // Restaura uploads se existirem
    const uploadEntries = zip.getEntries().filter((e) => e.entryName.startsWith('uploads/') && !e.isDirectory);
    for (const entry of uploadEntries) {
      const destPath = path.join(process.cwd(), entry.entryName);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
    }

    logger.info(`Restore concluído: ${tabelasRestauradas.length} tabelas, ${totalRegistros} registros.`);
    return { tabelasRestauradas, totalRegistros };
  }

  // ----------------------------------------------------------------
  // Helpers privados
  // ----------------------------------------------------------------

  private async exportDatabase(onlySettings: boolean) {
    if (onlySettings) {
      const settings = await prisma.systemSettings.findMany();
      return { systemSettings: settings };
    }

    const [
      systemSettings, users, categories, products, customers,
      caixas, sales, saleItems, caixaMovimentacoes, movimentacoesEstoque,
    ] = await Promise.all([
      prisma.systemSettings.findMany(),
      prisma.user.findMany({ select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true, updatedAt: true } }),
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.customer.findMany(),
      prisma.caixa.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.caixaMovimentacao.findMany(),
      prisma.movimentacaoEstoque.findMany(),
    ]);

    return {
      systemSettings, users, categories, products, customers,
      caixas, sales, saleItems, caixaMovimentacoes, movimentacoesEstoque,
    };
  }
}
