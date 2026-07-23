import { prisma } from '../config/database'

export type InsightTipo =
  | 'queda_vendas'
  | 'aumento_vendas'
  | 'estoque_critico'
  | 'produto_parado'
  | 'cliente_inativo'
  | 'promocao_ineficiente'
  | 'categoria_destaque'
  | 'oportunidade'

export interface Insight {
  tipo: InsightTipo
  titulo: string
  descricao: string
  severity: 'info' | 'warning' | 'error' | 'success'
  valor?: number
  entidade?: string
  acao?: string
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export class InsightService {
  async generate(companyId?: string | null): Promise<Insight[]> {
    const insights: Insight[] = []
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const fimMesPassado = new Date(now.getFullYear(), now.getMonth(), 0)
    const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tresMesesAtras = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    const where = companyId ? { companyId, status: 'FINALIZADA' as const } : { status: 'FINALIZADA' as const }
    const prodWhere = companyId ? { companyId } : {}

    const [vendasMes, vendasMesPassado, estoqueCritico, semEstoque] = await Promise.all([
      prisma.sale.aggregate({ where: { ...where, createdAt: { gte: inicioMes } }, _sum: { total: true }, _count: true }),
      prisma.sale.aggregate({ where: { ...where, createdAt: { gte: mesPassado, lte: fimMesPassado } }, _sum: { total: true }, _count: true }),
      prisma.product.count({ where: { ...prodWhere, ativo: true, estoque: { lte: prisma.product.fields.estoqueMinimo, gt: 0 } } })
        .catch(() => 0),
      prisma.product.count({ where: { ...prodWhere, ativo: true, estoque: 0 } }),
    ])

    const totalMes = Number(vendasMes._sum.total ?? 0)
    const totalMesPassado = Number(vendasMesPassado._sum.total ?? 0)

    // ── Tendência de vendas ─────────────────────────────────────────────────
    if (totalMesPassado > 0) {
      const variacao = ((totalMes - totalMesPassado) / totalMesPassado) * 100

      if (variacao <= -15) {
        insights.push({
          tipo: 'queda_vendas',
          titulo: 'Queda nas Vendas',
          descricao: `Faturamento ${Math.abs(variacao).toFixed(1)}% abaixo do mês anterior (${fmt(totalMesPassado)} → ${fmt(totalMes)}).`,
          severity: 'error',
          valor: variacao,
          acao: 'Verifique promoções ou entre em contato com clientes inativos.',
        })
      } else if (variacao >= 20) {
        insights.push({
          tipo: 'aumento_vendas',
          titulo: 'Crescimento Expressivo',
          descricao: `Vendas ${variacao.toFixed(1)}% acima do mês anterior. Excelente resultado!`,
          severity: 'success',
          valor: variacao,
          acao: 'Garanta estoque suficiente para sustentar o crescimento.',
        })
      }
    }

    // ── Estoque crítico ─────────────────────────────────────────────────────
    if (semEstoque > 0) {
      insights.push({
        tipo: 'estoque_critico',
        titulo: `${semEstoque} Produto${semEstoque !== 1 ? 's' : ''} Sem Estoque`,
        descricao: `${semEstoque} produto${semEstoque !== 1 ? 's' : ''} com estoque zerado e sem reposição.`,
        severity: 'error',
        valor: semEstoque,
        acao: 'Abra ordem de reposição imediatamente.',
      })
    }

    if (estoqueCritico > 0) {
      insights.push({
        tipo: 'estoque_critico',
        titulo: `${estoqueCritico} Produto${estoqueCritico !== 1 ? 's' : ''} com Estoque Baixo`,
        descricao: `${estoqueCritico} produto${estoqueCritico !== 1 ? 's' : ''} abaixo do mínimo recomendado.`,
        severity: 'warning',
        valor: estoqueCritico,
        acao: 'Revise o estoque e programe reposições.',
      })
    }

    // ── Produtos sem giro ───────────────────────────────────────────────────
    try {
      const produtosComVenda = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { ...where, createdAt: { gte: tresMesesAtras } } },
      })
      const idsComVenda = produtosComVenda.map((p) => p.productId)
      const semGiro = await prisma.product.count({
        where: { ...prodWhere, ativo: true, estoque: { gt: 0 }, id: { notIn: idsComVenda } },
      })
      if (semGiro > 0) {
        insights.push({
          tipo: 'produto_parado',
          titulo: `${semGiro} Produto${semGiro !== 1 ? 's' : ''} sem Giro`,
          descricao: `${semGiro} produto${semGiro !== 1 ? 's' : ''} com estoque mas sem venda nos últimos 3 meses.`,
          severity: 'warning',
          valor: semGiro,
          acao: 'Considere promoções para liquidar o estoque parado.',
        })
      }
    } catch { /* optional */ }

    // ── Clientes inativos ────────────────────────────────────────────────────
    try {
      const noventaDias = new Date(now)
      noventaDias.setDate(now.getDate() - 90)
      const clientesAtivos = await prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...where, customerId: { not: null }, createdAt: { gte: noventaDias } },
      })
      const idsAtivos = clientesAtivos.map((c) => c.customerId!)
      const clientesInativos = await prisma.customer.count({
        where: { ...(companyId ? { companyId } : {}), ativo: true, id: { notIn: idsAtivos } },
      })
      if (clientesInativos > 0) {
        insights.push({
          tipo: 'cliente_inativo',
          titulo: `${clientesInativos} Cliente${clientesInativos !== 1 ? 's' : ''} Inativo${clientesInativos !== 1 ? 's' : ''}`,
          descricao: `${clientesInativos} cliente${clientesInativos !== 1 ? 's' : ''} sem compra nos últimos 90 dias.`,
          severity: 'info',
          valor: clientesInativos,
          acao: 'Acione uma campanha de reativação via WhatsApp ou e-mail.',
        })
      }
    } catch { /* optional */ }

    // ── Promoções ineficientes ───────────────────────────────────────────────
    try {
      const promocoesAtivas = await prisma.promocao.findMany({
        where: { ativo: true, ...(companyId ? { companyId } : {}), dataInicio: { lte: hoje } },
        include: { produtos: { select: { productId: true } } },
      })
      for (const promo of promocoesAtivas) {
        const prodIds = promo.produtos.map((p) => p.productId)
        if (prodIds.length === 0) continue
        const vendas = await prisma.saleItem.count({
          where: {
            productId: { in: prodIds },
            sale: { ...where, createdAt: { gte: promo.dataInicio } },
          },
        })
        if (vendas === 0) {
          insights.push({
            tipo: 'promocao_ineficiente',
            titulo: `Promoção sem Resultado: ${promo.nome}`,
            descricao: `A promoção "${promo.nome}" está ativa mas não gerou nenhuma venda ainda.`,
            severity: 'warning',
            entidade: promo.id,
            acao: 'Avalie divulgar mais ou ajustar o desconto.',
          })
        }
      }
    } catch { /* optional */ }

    // ── Categoria destaque ───────────────────────────────────────────────────
    try {
      const topCat = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { ...where, createdAt: { gte: inicioMes } } },
        _sum: { subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 1,
      })
      if (topCat.length > 0) {
        const prod = await prisma.product.findUnique({
          where: { id: topCat[0].productId },
          include: { category: { select: { nome: true } } },
        })
        const catNome = (prod as any)?.category?.nome
        if (catNome) {
          const total = Number(topCat[0]._sum.subtotal ?? 0)
          const pct = totalMes > 0 ? (total / totalMes) * 100 : 0
          insights.push({
            tipo: 'categoria_destaque',
            titulo: `Categoria Destaque: ${catNome}`,
            descricao: `A categoria "${catNome}" responde por ${pct.toFixed(1)}% do faturamento deste mês.`,
            severity: 'success',
            valor: total,
          })
        }
      }
    } catch { /* optional */ }

    // ── Oportunidade ─────────────────────────────────────────────────────────
    const hoje_dia = now.getDate()
    if (hoje_dia >= 25) {
      insights.push({
        tipo: 'oportunidade',
        titulo: 'Final de Mês: Oportunidade de Vendas',
        descricao: `Faltam ${31 - hoje_dia} dias para o fim do mês. Acelere as vendas com promoções relâmpago.`,
        severity: 'info',
        acao: 'Crie uma promoção temporária para aumentar o volume.',
      })
    }

    return insights
  }
}
