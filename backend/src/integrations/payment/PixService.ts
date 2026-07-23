import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { getPaymentProvider } from './PaymentProviderFactory';
import { PixPaymentRequest } from './IPaymentProvider';
import { PixStatus } from '@prisma/client';

export class PixService {
  async createPayment(data: PixPaymentRequest & { saleId?: string }) {
    const provider = getPaymentProvider();

    const result = await provider.createPixPayment(data);

    const pixPayment = await prisma.pixPayment.create({
      data: {
        saleId: data.saleId,
        valor: data.valor,
        status: 'PENDENTE',
        provider: provider.name,
        txid: result.txid,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
      },
    });

    return pixPayment;
  }

  async getStatus(id: string) {
    const pix = await prisma.pixPayment.findUnique({ where: { id } });
    if (!pix) throw new AppError('Pagamento PIX não encontrado.', 404);

    if (pix.status === 'PAGO' || pix.status === 'CANCELADO') return pix;

    const provider = getPaymentProvider(pix.provider);
    const remote = await provider.getPaymentStatus(pix.txid ?? id);

    if (remote.status !== pix.status) {
      const updated = await prisma.pixPayment.update({
        where: { id },
        data: {
          status: remote.status as PixStatus,
          paidAt: remote.paidAt,
        },
      });
      return updated;
    }

    return pix;
  }

  async cancel(id: string) {
    const pix = await prisma.pixPayment.findUnique({ where: { id } });
    if (!pix) throw new AppError('Pagamento PIX não encontrado.', 404);
    if (pix.status !== 'PENDENTE') throw new AppError('Apenas pagamentos pendentes podem ser cancelados.', 400);

    const provider = getPaymentProvider(pix.provider);
    await provider.cancelPayment(pix.txid ?? id);

    return prisma.pixPayment.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async handleWebhook(headers: Record<string, string>, body: unknown, providerName?: string) {
    const provider = getPaymentProvider(providerName);
    const payload = await provider.parseWebhook(headers, body);

    if (!payload.txid) {
      logger.warn('[PIX Webhook] txid ausente no payload', { provider: provider.name });
      return;
    }

    const pix = await prisma.pixPayment.findFirst({ where: { txid: payload.txid } });
    if (!pix) {
      logger.warn('[PIX Webhook] txid não encontrado no banco', { txid: payload.txid });
      return;
    }

    const newStatus = payload.status.toUpperCase().includes('PAGO')
      || payload.status.toLowerCase().includes('approved')
      || payload.status.toLowerCase().includes('payment.approved')
      || payload.status.toLowerCase().includes('succeeded')
        ? 'PAGO' : pix.status;

    await prisma.pixPayment.update({
      where: { id: pix.id },
      data: {
        status: newStatus as PixStatus,
        paidAt: payload.paidAt ? new Date(payload.paidAt) : pix.paidAt,
        webhookPayload: payload.rawPayload as object,
      },
    });

    logger.info('[PIX Webhook] Pagamento atualizado', { txid: payload.txid, status: newStatus });
  }

  async listBySale(saleId: string) {
    return prisma.pixPayment.findMany({ where: { saleId }, orderBy: { createdAt: 'desc' } });
  }

  async findAll(params: { status?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = params.status ? { status: params.status as PixStatus } : {};

    const [items, total] = await Promise.all([
      prisma.pixPayment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.pixPayment.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
