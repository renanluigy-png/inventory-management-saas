import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { env } from '../../config/env';
import { MockFiscalProvider } from './providers/MockFiscalProvider';
import { IFiscalProvider, EmissaoFiscalRequest, TipoDocumento } from './IFiscalProvider';
import { TipoDocumentoFiscal } from '@prisma/client';

function getProvider(): IFiscalProvider {
  switch (env.FISCAL_PROVIDER) {
    case 'mock':
    default:
      return new MockFiscalProvider();
  }
}

export class FiscalService {
  private provider: IFiscalProvider;

  constructor() {
    this.provider = getProvider();
  }

  async emitir(request: EmissaoFiscalRequest & { saleId?: string }) {
    if (!this.provider.tiposSuportados.includes(request.tipo)) {
      throw new AppError(`Tipo de documento "${request.tipo}" não suportado pelo provedor "${this.provider.name}".`, 400);
    }

    const result = await this.provider.emitir(request);

    const doc = await prisma.documentoFiscal.create({
      data: {
        saleId: request.saleId,
        tipo: request.tipo as TipoDocumentoFiscal,
        numero: result.numero,
        serie: result.serie,
        chaveAcesso: result.chaveAcesso,
        status: result.status,
        provider: this.provider.name,
        xml: result.xml,
        pdf: result.pdf,
        payload: request as unknown as object,
        resposta: result as unknown as object,
      },
    });

    return doc;
  }

  async cancelar(id: string, motivo: string) {
    const doc = await prisma.documentoFiscal.findUnique({ where: { id } });
    if (!doc) throw new AppError('Documento fiscal não encontrado.', 404);
    if (doc.status !== 'emitido') throw new AppError('Apenas documentos emitidos podem ser cancelados.', 400);
    if (!doc.chaveAcesso) throw new AppError('Documento sem chave de acesso registrada.', 400);

    const result = await this.provider.cancelar(doc.chaveAcesso, motivo);

    return prisma.documentoFiscal.update({
      where: { id },
      data: { status: result.status, resposta: result as unknown as object },
    });
  }

  async consultar(id: string) {
    const doc = await prisma.documentoFiscal.findUnique({ where: { id } });
    if (!doc) throw new AppError('Documento fiscal não encontrado.', 404);
    if (!doc.chaveAcesso) throw new AppError('Documento sem chave de acesso.', 400);

    const remote = await this.provider.consultar(doc.chaveAcesso);
    return { documento: doc, consulta: remote };
  }

  async findBySale(saleId: string) {
    return prisma.documentoFiscal.findMany({ where: { saleId }, orderBy: { createdAt: 'desc' } });
  }

  async findAll(params: { tipo?: string; status?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(params.tipo ? { tipo: params.tipo as TipoDocumentoFiscal } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.documentoFiscal.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.documentoFiscal.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  getProviders(): { ativo: string; suportados: TipoDocumento[] } {
    return { ativo: this.provider.name, suportados: this.provider.tiposSuportados };
  }
}
