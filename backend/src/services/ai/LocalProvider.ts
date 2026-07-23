import type { IAIProvider, AIMessage, AIResponse } from './IAIProvider'
import { prisma } from '../../config/database'

// ── Intent patterns ──────────────────────────────────────────────────────────
const INTENTS = {
  VENDAS_HOJE: /vend.*hoje|hoje.*vend|faturei.*hoje|quanto.*vendi.*hoje/i,
  VENDAS_SEMANA: /vend.*semana|semana.*vend|faturei.*semana|esta.*semana/i,
  VENDAS_MES: /vend.*m[eê]s|m[eê]s.*vend|faturamento|faturei.*m[eê]s/i,
  LUCRO: /lucro|margem|ganho|rendimento/i,
  PRODUTO_TOP: /produto.*mais.*vend|mais.*vend.*produto|top.*produto|melhor.*produto|lider.*vend/i,
  ESTOQUE_BAIXO: /estoque.*baixo|estoque.*acabando|acabando|ruptura|faltando|cr[ií]tico|acabar/i,
  SEM_ESTOQUE: /sem.*estoque|estoque.*zero|zerado|esgotado/i,
  CLIENTE_TOP: /melhor.*cliente|cliente.*melhor|top.*cliente|maior.*cliente|quem.*mais.*comp/i,
  CLIENTES_INATIVOS: /cliente.*inativo|inativo.*cliente|cliente.*sumiu|n[aã]o.*comp.*tempo/i,
  PROMOCOES: /promo[çc][aã]o|promo[çc][oõ]es|desconto.*ativo|oferta/i,
  INCONSISTENCIA: /inconsist[eê]ncia|problema.*estoque|estoque.*problema|erro.*estoque/i,
  RESUMO: /resumo|vis[aã]o.*geral|como.*est[aá]|tudo.*bem|status.*geral|relat[oó]rio/i,
  PRODUTOS_PARADOS: /produto.*parado|parado.*produto|sem.*giro|giro.*zero|n[aã]o.*vend/i,
  CAIXAS_ABERTOS: /caixa.*aberto|aberto.*caixa|caixa.*hoje/i,
  PREVISAO: /previs[aã]o|estimativa|pr[oó]xim|projeto/i,
  CATEGORIAS: /categoria|departamento|se[çc][aã]o/i,
} as const

type Intent = keyof typeof INTENTS

function detectIntent(text: string): Intent | null {
  for (const [intent, pattern] of Object.entries(INTENTS)) {
    if (pattern.test(text)) return intent as Intent
  }
  return null
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtN(n: number) {
  return n.toLocaleString('pt-BR')
}

// ── Local data helpers ──────────────────────────────────────────────────────

async function getERPContext(companyId?: string | null) {
  const now = new Date()
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay())
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const fimMesPassado = new Date(now.getFullYear(), now.getMonth(), 0)

  const where = companyId ? { companyId, status: 'FINALIZADA' as const } : { status: 'FINALIZADA' as const }

  const [vendasHoje, vendasSemana, vendasMes, vendasMesPassado] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...where, createdAt: { gte: hoje } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { ...where, createdAt: { gte: inicioSemana } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { ...where, createdAt: { gte: inicioMes } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { ...where, createdAt: { gte: mesPassado, lte: fimMesPassado } },
      _sum: { total: true },
      _count: { id: true },
    }),
  ])

  const produtoWhere = companyId ? { companyId } : {}

  const [estoqueBaixo, semEstoque, topProdutos, topClientes, promocoes, caixasAbertos, categorias] =
    await Promise.all([
      prisma.product.findMany({
        where: { ...produtoWhere, ativo: true, estoque: { lte: prisma.product.fields.estoqueMinimo } },
        orderBy: { estoque: 'asc' },
        take: 8,
        select: { nome: true, estoque: true, estoqueMinimo: true },
      }).catch(() =>
        prisma.$queryRaw<Array<{ nome: string; estoque: number; estoqueMinimo: number }>>`
          SELECT nome, estoque, "estoqueMinimo" FROM products
          WHERE ${companyId ? `"companyId" = ${companyId} AND` : ''} ativo = true
          AND estoque <= "estoqueMinimo"
          ORDER BY estoque ASC LIMIT 8
        `.catch(() => [] as Array<{ nome: string; estoque: number; estoqueMinimo: number }>)
      ),

      prisma.product.count({ where: { ...produtoWhere, ativo: true, estoque: 0 } }),

      prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: { ...where, createdAt: { gte: inicioMes } },
        },
        _sum: { quantidade: true, subtotal: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 5,
      }).then(async (items) => {
        const products = await prisma.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: { id: true, nome: true },
        })
        return items.map((i) => ({
          nome: products.find((p) => p.id === i.productId)?.nome ?? 'Desconhecido',
          quantidade: Number(i._sum.quantidade ?? 0),
          receita: Number(i._sum.subtotal ?? 0),
        }))
      }),

      prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...where, customerId: { not: null }, createdAt: { gte: inicioMes } },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }).then(async (items) => {
        const customers = await prisma.customer.findMany({
          where: { id: { in: items.map((i) => i.customerId!).filter(Boolean) } },
          select: { id: true, nome: true },
        })
        return items.map((i) => ({
          nome: customers.find((c) => c.id === i.customerId)?.nome ?? 'Consumidor Final',
          total: Number(i._sum.total ?? 0),
          compras: i._count.id,
        }))
      }),

      prisma.promocao.findMany({
        where: {
          ativo: true,
          ...(companyId ? { companyId } : {}),
          OR: [{ dataFim: null }, { dataFim: { gte: now } }],
        },
        select: { nome: true, tipo: true, valor: true, dataFim: true },
        take: 5,
      }),

      prisma.caixa.count({
        where: { status: 'ABERTO', ...(companyId ? { companyId } : {}) },
      }),

      prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { ...where, createdAt: { gte: inicioMes } } },
        _sum: { subtotal: true },
      }).then(async (items) => {
        const products = await prisma.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          include: { category: { select: { nome: true } } },
        })
        const catMap: Record<string, number> = {}
        for (const item of items) {
          const p = products.find((x) => x.id === item.productId)
          const cat = (p as any)?.category?.nome ?? 'Sem categoria'
          catMap[cat] = (catMap[cat] ?? 0) + Number(item._sum.subtotal ?? 0)
        }
        return Object.entries(catMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([nome, total]) => ({ nome, total }))
      }),
    ])

  const totalMes = Number(vendasMes._sum.total ?? 0)
  const totalMesPassado = Number(vendasMesPassado._sum.total ?? 0)
  const variacaoMes = totalMesPassado > 0 ? ((totalMes - totalMesPassado) / totalMesPassado) * 100 : 0

  return {
    vendasHoje: { total: Number(vendasHoje._sum.total ?? 0), count: vendasHoje._count.id },
    vendasSemana: { total: Number(vendasSemana._sum.total ?? 0), count: vendasSemana._count.id },
    vendasMes: { total: totalMes, count: vendasMes._count.id },
    vendasMesPassado: { total: totalMesPassado, count: vendasMesPassado._count.id },
    variacaoMes,
    estoqueBaixo: Array.isArray(estoqueBaixo) ? estoqueBaixo : [],
    semEstoque,
    topProdutos,
    topClientes,
    promocoes,
    caixasAbertos,
    categorias,
  }
}

// ── Response generators per intent ──────────────────────────────────────────

type ERPCtx = Awaited<ReturnType<typeof getERPContext>>

const generators: Partial<Record<Intent, (ctx: ERPCtx) => string>> = {
  VENDAS_HOJE: (ctx) => {
    const v = ctx.vendasHoje
    return `## Vendas de Hoje\n\n📊 **${fmtN(v.count)} venda${v.count !== 1 ? 's' : ''}** · Total: **${fmt(v.total)}**\n\n${
      v.count === 0
        ? '> Nenhuma venda finalizada hoje ainda.'
        : `Média por venda: **${fmt(v.count > 0 ? v.total / v.count : 0)}**`
    }`
  },

  VENDAS_SEMANA: (ctx) => {
    const v = ctx.vendasSemana
    return `## Vendas desta Semana\n\n📈 **${fmtN(v.count)} venda${v.count !== 1 ? 's' : ''}** · Total: **${fmt(v.total)}**\n\nMédia diária: **${fmt(v.total / 7)}**`
  },

  VENDAS_MES: (ctx) => {
    const { vendasMes: v, variacaoMes, vendasMesPassado } = ctx
    const sinal = variacaoMes >= 0 ? '▲' : '▼'
    const cor = variacaoMes >= 0 ? '🟢' : '🔴'
    return `## Vendas do Mês\n\n${cor} **${fmtN(v.count)} venda${v.count !== 1 ? 's' : ''}** · Total: **${fmt(v.total)}**\n\n${
      vendasMesPassado.total > 0
        ? `${sinal} **${Math.abs(variacaoMes).toFixed(1)}%** em relação ao mês passado (${fmt(vendasMesPassado.total)})`
        : 'Sem dados do mês anterior para comparação.'
    }`
  },

  PRODUTO_TOP: (ctx) => {
    if (ctx.topProdutos.length === 0)
      return '## Top Produtos\n\nNenhuma venda registrada neste mês ainda.'
    const linhas = ctx.topProdutos
      .map((p, i) => `${i + 1}. **${p.nome}** — ${fmtN(p.quantidade)} unid · ${fmt(p.receita)}`)
      .join('\n')
    return `## Produtos Mais Vendidos (mês atual)\n\n${linhas}`
  },

  ESTOQUE_BAIXO: (ctx) => {
    const lista = ctx.estoqueBaixo
    if (lista.length === 0)
      return '## Estoque Crítico\n\n✅ Nenhum produto abaixo do estoque mínimo.'
    const linhas = lista
      .map((p) => `- **${p.nome}**: ${fmtN(p.estoque)} (mín: ${fmtN(p.estoqueMinimo)})`)
      .join('\n')
    return `## Produtos com Estoque Baixo\n\n⚠️ **${lista.length} produto${lista.length !== 1 ? 's' : ''}** abaixo do mínimo:\n\n${linhas}`
  },

  SEM_ESTOQUE: (ctx) => {
    return ctx.semEstoque === 0
      ? '## Produtos Sem Estoque\n\n✅ Nenhum produto com estoque zerado.'
      : `## Produtos Sem Estoque\n\n🚨 **${fmtN(ctx.semEstoque)} produto${ctx.semEstoque !== 1 ? 's' : ''}** com estoque zerado.\n\nVá para **Produtos** e abasteça o estoque para evitar ruptura.`
  },

  CLIENTE_TOP: (ctx) => {
    if (ctx.topClientes.length === 0)
      return '## Top Clientes\n\nNenhuma venda com cliente identificado neste mês.'
    const linhas = ctx.topClientes
      .map((c, i) => `${i + 1}. **${c.nome}** — ${fmtN(c.compras)} compra${c.compras !== 1 ? 's' : ''} · ${fmt(c.total)}`)
      .join('\n')
    return `## Melhores Clientes (mês atual)\n\n${linhas}`
  },

  PROMOCOES: (ctx) => {
    if (ctx.promocoes.length === 0)
      return '## Promoções Ativas\n\nNenhuma promoção ativa no momento.'
    const tipoLabel: Record<string, string> = {
      PERCENTUAL: 'desconto %',
      VALOR_FIXO: 'desconto fixo',
      PRECO_ESPECIAL: 'preço especial',
    }
    const linhas = ctx.promocoes
      .map((p) => {
        const tipo = tipoLabel[p.tipo] ?? p.tipo
        const val = p.tipo === 'PERCENTUAL' ? `${p.valor}%` : fmt(Number(p.valor))
        const fim = p.dataFim ? ` · encerra ${new Date(p.dataFim).toLocaleDateString('pt-BR')}` : ''
        return `- **${p.nome}** — ${val} (${tipo})${fim}`
      })
      .join('\n')
    return `## Promoções Ativas\n\n🏷️ **${ctx.promocoes.length} promoção${ctx.promocoes.length !== 1 ? 'ões' : 'ão'}** ativas:\n\n${linhas}`
  },

  CAIXAS_ABERTOS: (ctx) => {
    return ctx.caixasAbertos === 0
      ? '## Caixas\n\nNenhum caixa aberto no momento.'
      : `## Caixas Abertos\n\n🔓 **${fmtN(ctx.caixasAbertos)} caixa${ctx.caixasAbertos !== 1 ? 's' : ''}** aberto${ctx.caixasAbertos !== 1 ? 's' : ''} neste momento.`
  },

  CATEGORIAS: (ctx) => {
    if (ctx.categorias.length === 0)
      return '## Vendas por Categoria\n\nNenhum dado disponível neste mês.'
    const linhas = ctx.categorias
      .map((c, i) => `${i + 1}. **${c.nome}** — ${fmt(c.total)}`)
      .join('\n')
    return `## Vendas por Categoria (mês atual)\n\n${linhas}`
  },

  RESUMO: (ctx) => {
    const { vendasHoje, vendasMes, estoqueBaixo, semEstoque, caixasAbertos, promocoes } = ctx
    const alertas: string[] = []
    if (semEstoque > 0) alertas.push(`🚨 ${fmtN(semEstoque)} produto${semEstoque !== 1 ? 's' : ''} sem estoque`)
    if (estoqueBaixo.length > 0) alertas.push(`⚠️ ${estoqueBaixo.length} produto${estoqueBaixo.length !== 1 ? 's' : ''} com estoque baixo`)
    if (caixasAbertos > 0) alertas.push(`🔓 ${fmtN(caixasAbertos)} caixa${caixasAbertos !== 1 ? 's' : ''} aberto${caixasAbertos !== 1 ? 's' : ''}`)
    const alertasSection = alertas.length > 0 ? `\n\n### Alertas\n${alertas.join('\n')}` : ''
    const topProd = ctx.topProdutos[0] ? `\n\n**Top produto do mês:** ${ctx.topProdutos[0].nome} (${fmtN(ctx.topProdutos[0].quantidade)} unid)` : ''

    return `## Resumo Geral\n\n| Período | Vendas | Faturamento |\n|---------|--------|-------------|\n| Hoje | ${fmtN(vendasHoje.count)} | ${fmt(vendasHoje.total)} |\n| Mês atual | ${fmtN(vendasMes.count)} | ${fmt(vendasMes.total)} |\n${topProd}${alertasSection}\n\n> Promoções ativas: **${promotions_count(ctx)}**  ·  Promoções: ${ctx.promocoes.map((p) => p.nome).join(', ') || 'nenhuma'}`

    function promotions_count(c: ERPCtx) { return c.promocoes.length }
  },

  PREVISAO: (ctx) => {
    const { vendasMes, vendasMesPassado } = ctx
    const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const diaAtual = new Date().getDate()
    const projecao = diaAtual > 0 ? (vendasMes.total / diaAtual) * diasNoMes : 0
    const diff = projecao - vendasMesPassado.total
    const sinal = diff >= 0 ? '▲' : '▼'
    return `## Previsão de Faturamento\n\n📅 **Projeção para o mês:** ${fmt(projecao)}\n\n- Faturado até hoje (dia ${diaAtual}): ${fmt(vendasMes.total)}\n- Mês anterior: ${fmt(vendasMesPassado.total)}\n- Variação projetada: ${sinal} ${fmt(Math.abs(diff))}\n\n> _Baseado no ritmo atual de vendas._`
  },
}

// ── LocalProvider class ──────────────────────────────────────────────────────

export class LocalProvider implements IAIProvider {
  readonly name = 'local'

  isAvailable(): boolean {
    return true
  }

  async chat(messages: AIMessage[], _systemPrompt: string): Promise<AIResponse> {
    const start = Date.now()
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return { content: 'Como posso ajudar?', provider: this.name, durationMs: 0 }
    }

    // Extract companyId from system prompt if present
    const companyMatch = _systemPrompt.match(/companyId:\s*([a-f0-9-]+)/i)
    const companyId = companyMatch?.[1] ?? null

    const ctx = await getERPContext(companyId)
    const intent = detectIntent(lastUser.content)
    const generator = intent ? generators[intent] : null
    const content = generator
      ? generator(ctx)
      : await this.fallbackResponse(lastUser.content, ctx)

    return { content, provider: this.name, durationMs: Date.now() - start }
  }

  async stream(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void,
  ): Promise<AIResponse> {
    const response = await this.chat(messages, systemPrompt)
    // Simulate streaming by sending the full response in chunks
    const words = response.content.split(' ')
    for (const word of words) {
      onChunk(word + ' ')
      await new Promise((r) => setTimeout(r, 8))
    }
    return response
  }

  private async fallbackResponse(question: string, ctx: ERPCtx): Promise<string> {
    const resumo = generators.RESUMO!(ctx)
    return `Não entendi completamente sua pergunta: _"${question}"_\n\nAqui está um resumo geral que pode ajudar:\n\n${resumo}\n\n---\n💡 **Experimente perguntar:**\n- "Quanto vendi hoje?"\n- "Quais produtos estão acabando?"\n- "Quem é meu melhor cliente?"\n- "Mostre vendas por categoria"\n- "Quais promoções estão ativas?"`
  }
}
