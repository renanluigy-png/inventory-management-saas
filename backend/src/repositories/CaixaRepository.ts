import { Prisma, TipoMovimentacaoCaixa } from '@prisma/client';
import { prisma } from '../config/database';

export class CaixaRepository {
  async findAberto() {
    return prisma.caixa.findFirst({
      where: { status: 'ABERTO' },
      include: {
        user: { select: { id: true, nome: true } },
        movimentacoes: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { abertura: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.caixa.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nome: true } },
        movimentacoes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findAll(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.caixa.count(),
      prisma.caixa.findMany({
        skip,
        take: limit,
        include: { user: { select: { id: true, nome: true } } },
        orderBy: { abertura: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async abrir(data: { userId: string; saldoInicial: number; observacao?: string }) {
    return prisma.caixa.create({
      data: {
        userId: data.userId,
        saldoInicial: data.saldoInicial,
        observacao: data.observacao,
        status: 'ABERTO',
      },
      include: { user: { select: { id: true, nome: true } } },
    });
  }

  async fechar(id: string, data: { saldoFinal: number; observacao?: string }) {
    return prisma.caixa.update({
      where: { id },
      data: {
        status: 'FECHADO',
        fechamento: new Date(),
        saldoFinal: data.saldoFinal,
        observacao: data.observacao,
      },
    });
  }

  async addMovimentacao(data: {
    caixaId: string;
    tipo: TipoMovimentacaoCaixa;
    valor: number;
    descricao?: string;
  }) {
    return prisma.caixaMovimentacao.create({ data });
  }

  async getSaldoAtual(caixaId: string): Promise<number> {
    const caixa = await prisma.caixa.findUnique({
      where: { id: caixaId },
      select: { saldoInicial: true },
    });
    if (!caixa) return 0;

    const groups = await prisma.caixaMovimentacao.groupBy({
      by: ['tipo'],
      where: { caixaId },
      _sum: { valor: true },
    });

    let saldo = Number(caixa.saldoInicial);
    for (const g of groups) {
      const val = Number(g._sum.valor ?? 0);
      saldo += g.tipo === 'ENTRADA' || g.tipo === 'SUPRIMENTO' ? val : -val;
    }
    return Math.round(saldo * 100) / 100;
  }
}
