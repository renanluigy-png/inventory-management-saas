import { env } from '../config/env'
import { prisma } from '../config/database'
import type { IAIProvider } from './ai/IAIProvider'
import { LocalProvider } from './ai/LocalProvider'

let providerInstance: IAIProvider | null = null

function getProvider(): IAIProvider {
  if (providerInstance) return providerInstance

  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = require('./ai/AnthropicProvider')
    providerInstance = new AnthropicProvider(env.ANTHROPIC_API_KEY)
    return providerInstance!
  }

  providerInstance = new LocalProvider()
  return providerInstance
}

const ERP_SYSTEM_PROMPT = `Você é o Copiloto IA do ERP — um assistente especializado em gestão empresarial integrado a um sistema de controle de estoque e vendas. Você responde em português brasileiro de forma clara, objetiva e profissional.

Suas especialidades:
- Análise de vendas e faturamento
- Gestão de estoque e produtos
- Análise de clientes e comportamento de compra
- Promoções e preços
- Fluxo de caixa e financeiro
- Insights e tendências de negócio

Ao responder:
- Use markdown para formatar (tabelas, listas, negrito)
- Seja direto e objetivo
- Ofereça recomendações práticas quando relevante
- Use emojis com moderação para destacar alertas
- Quando não souber algo, diga claramente

Dados do ERP disponíveis: vendas, produtos, estoque, clientes, caixa, promoções.`

export class AIService {
  async sendMessage(params: {
    userId: string
    companyId?: string | null
    chatId?: string | null
    message: string
    stream?: boolean
    onChunk?: (chunk: string) => void
  }): Promise<{ chatId: string; response: string; provider: string }> {
    const { userId, companyId, message, stream, onChunk } = params
    let { chatId } = params

    // Create chat session if not provided
    if (!chatId) {
      const chat = await prisma.aIChat.create({
        data: {
          userId,
          companyId,
          titulo: message.slice(0, 60),
        },
      })
      chatId = chat.id
    }

    // Save user message
    await prisma.aIMensagem.create({
      data: { chatId, role: 'user', conteudo: message },
    })

    // Fetch last 10 messages for context
    const history = await prisma.aIMensagem.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const messages = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.conteudo,
    }))

    const systemPrompt = `${ERP_SYSTEM_PROMPT}\ncompanyId: ${companyId ?? 'global'}`
    const provider = getProvider()

    let response: { content: string; provider: string }

    if (stream && onChunk) {
      response = await provider.stream(messages, systemPrompt, onChunk)
    } else {
      response = await provider.chat(messages, systemPrompt)
    }

    // Save assistant response
    await prisma.aIMensagem.create({
      data: {
        chatId,
        role: 'assistant',
        conteudo: response.content,
        metadados: { provider: response.provider },
      },
    })

    // Update chat title from first message if still default
    const chat = await prisma.aIChat.findUnique({ where: { id: chatId } })
    if (chat?.titulo === 'Nova conversa') {
      await prisma.aIChat.update({
        where: { id: chatId },
        data: { titulo: message.slice(0, 60) },
      })
    }

    return { chatId, response: response.content, provider: response.provider }
  }

  async getChats(userId: string) {
    return prisma.aIChat.findMany({
      where: { userId, arquivado: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        titulo: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { mensagens: true } },
      },
    })
  }

  async getChat(chatId: string, userId: string) {
    return prisma.aIChat.findFirst({
      where: { id: chatId, userId },
      include: { mensagens: { orderBy: { createdAt: 'asc' } } },
    })
  }

  async deleteChat(chatId: string, userId: string) {
    return prisma.aIChat.deleteMany({ where: { id: chatId, userId } })
  }

  async favoriteMessage(mensagemId: string, userId: string) {
    const msg = await prisma.aIMensagem.findFirst({
      where: { id: mensagemId, chat: { userId } },
    })
    if (!msg) return null
    return prisma.aIMensagem.update({
      where: { id: mensagemId },
      data: { favorita: !msg.favorita },
    })
  }

  async getFavoriteMessages(userId: string) {
    return prisma.aIMensagem.findMany({
      where: { chat: { userId }, favorita: true },
      orderBy: { createdAt: 'desc' },
      include: { chat: { select: { titulo: true } } },
    })
  }

  getProviderInfo() {
    const provider = getProvider()
    const isAI = env.AI_PROVIDER !== 'local' && !!env.ANTHROPIC_API_KEY
    return {
      provider: provider.name,
      model: isAI ? env.ANTHROPIC_MODEL : 'local',
      isAI,
      available: provider.isAvailable(),
    }
  }
}
