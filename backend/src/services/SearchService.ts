import { prisma } from '../config/database';

const MAX_RESULTS_PER_TYPE = 5;

export class SearchService {
  async search(query: string) {
    if (!query || query.trim().length < 2) {
      return { produtos: [], clientes: [], vendas: [], categorias: [], promocoes: [] };
    }

    const q = query.trim();
    const likeQ = { contains: q, mode: 'insensitive' as const };

    const [produtos, clientes, vendas, categorias, promocoes] = await Promise.all([
      prisma.product.findMany({
        where: {
          ativo: true,
          OR: [{ nome: likeQ }, { sku: likeQ }, { codigoBarras: likeQ }, { descricao: likeQ }],
        },
        select: {
          id: true,
          nome: true,
          sku: true,
          preco: true,
          estoque: true,
          imagemUrl: true,
          category: { select: { nome: true } },
        },
        take: MAX_RESULTS_PER_TYPE,
      }),

      prisma.customer.findMany({
        where: {
          ativo: true,
          OR: [{ nome: likeQ }, { cpf: likeQ }, { email: likeQ }, { telefone: likeQ }],
        },
        select: { id: true, nome: true, cpf: true, email: true, telefone: true },
        take: MAX_RESULTS_PER_TYPE,
      }),

      // Vendas: busca por número (se for numérico) ou pelo nome do cliente
      isNaN(Number(q))
        ? prisma.sale.findMany({
            where: {
              status: { not: 'CANCELADA' },
              customer: { nome: likeQ },
            },
            select: {
              id: true,
              numero: true,
              total: true,
              status: true,
              createdAt: true,
              customer: { select: { nome: true } },
            },
            take: MAX_RESULTS_PER_TYPE,
            orderBy: { createdAt: 'desc' },
          })
        : prisma.sale.findMany({
            where: { numero: Number(q) },
            select: {
              id: true,
              numero: true,
              total: true,
              status: true,
              createdAt: true,
              customer: { select: { nome: true } },
            },
            take: MAX_RESULTS_PER_TYPE,
          }),

      prisma.category.findMany({
        where: { ativo: true, nome: likeQ },
        select: { id: true, nome: true, descricao: true },
        take: MAX_RESULTS_PER_TYPE,
      }),

      prisma.promocao.findMany({
        where: { ativo: true, OR: [{ nome: likeQ }, { descricao: likeQ }] },
        select: { id: true, nome: true, tipo: true, valor: true, dataInicio: true, dataFim: true },
        take: MAX_RESULTS_PER_TYPE,
      }),
    ]);

    const total =
      produtos.length + clientes.length + vendas.length + categorias.length + promocoes.length;

    return {
      query: q,
      total,
      produtos: produtos.map((p) => ({
        ...p,
        preco: Number(p.preco),
        _type: 'produto',
        _label: p.nome,
        _path: `/products/${p.id}`,
      })),
      clientes: clientes.map((c) => ({
        ...c,
        _type: 'cliente',
        _label: c.nome,
        _path: `/customers/${c.id}`,
      })),
      vendas: vendas.map((v) => ({
        ...v,
        total: Number(v.total),
        _type: 'venda',
        _label: `Venda #${v.numero}`,
        _path: `/sales/${v.id}`,
      })),
      categorias: categorias.map((c) => ({
        ...c,
        _type: 'categoria',
        _label: c.nome,
        _path: `/categories`,
      })),
      promocoes: promocoes.map((p) => ({
        ...p,
        valor: Number(p.valor),
        _type: 'promocao',
        _label: p.nome,
        _path: `/promotions`,
      })),
    };
  }
}
