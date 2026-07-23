import type { Request, Response } from 'express'
import { z } from 'zod'
import { AIService } from '../services/AIService'
import { InsightService } from '../services/InsightService'
import { AppError } from '../utils/AppError'

const aiService = new AIService()
const insightService = new InsightService()

const sendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  chatId: z.string().uuid().optional(),
  stream: z.boolean().optional().default(false),
})

export class AIController {
  async chat(req: Request, res: Response) {
    const { message, chatId, stream } = sendMessageSchema.parse(req.body)
    const userId = req.user!.sub
    const companyId = req.user!.companyId ?? null

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      let newChatId = chatId
      let fullContent = ''

      const result = await aiService.sendMessage({
        userId,
        companyId,
        chatId: chatId ?? null,
        message,
        stream: true,
        onChunk: (chunk: string) => {
          fullContent += chunk
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        },
      })

      newChatId = result.chatId
      res.write(`data: ${JSON.stringify({ done: true, chatId: newChatId, provider: result.provider })}\n\n`)
      res.end()
      return
    }

    const result = await aiService.sendMessage({
      userId,
      companyId,
      chatId: chatId ?? null,
      message,
    })

    res.json({ status: 'success', data: result })
  }

  async getChats(req: Request, res: Response) {
    const userId = req.user!.sub
    const chats = await aiService.getChats(userId)
    res.json({ status: 'success', data: { chats } })
  }

  async getChat(req: Request, res: Response) {
    const id = String(req.params.id)
    const userId = req.user!.sub
    const chat = await aiService.getChat(id, userId)
    if (!chat) throw new AppError('Conversa não encontrada', 404)
    res.json({ status: 'success', data: { chat } })
  }

  async deleteChat(req: Request, res: Response) {
    const id = String(req.params.id)
    const userId = req.user!.sub
    await aiService.deleteChat(id, userId)
    res.json({ status: 'success', data: { deleted: true } })
  }

  async favoriteMessage(req: Request, res: Response) {
    const id = String(req.params.id)
    const userId = req.user!.sub
    const msg = await aiService.favoriteMessage(id, userId)
    if (!msg) throw new AppError('Mensagem não encontrada', 404)
    res.json({ status: 'success', data: { mensagem: msg } })
  }

  async getFavorites(req: Request, res: Response) {
    const userId = req.user!.sub
    const mensagens = await aiService.getFavoriteMessages(userId)
    res.json({ status: 'success', data: { mensagens } })
  }

  async getInsights(req: Request, res: Response) {
    const companyId = req.user!.companyId ?? null
    const insights = await insightService.generate(companyId)
    res.json({ status: 'success', data: { insights } })
  }

  async getProviderInfo(req: Request, res: Response) {
    const info = aiService.getProviderInfo()
    res.json({ status: 'success', data: info })
  }

  async naturalSearch(req: Request, res: Response) {
    const { query } = z.object({ query: z.string().min(1).max(500) }).parse(req.body)
    const companyId = req.user!.companyId ?? null

    // Route natural language search through the AI chat system
    const userId = req.user!.sub
    const result = await aiService.sendMessage({
      userId,
      companyId,
      chatId: null,
      message: query,
    })
    res.json({ status: 'success', data: { result: result.response, chatId: result.chatId } })
  }

  async exportChat(req: Request, res: Response) {
    const id = String(req.params.id)
    const userId = req.user!.sub
    const chat = await aiService.getChat(id, userId)
    if (!chat) throw new AppError('Conversa não encontrada', 404)

    const lines: string[] = [`# ${chat.titulo}`, `Exportado em: ${new Date().toLocaleString('pt-BR')}`, '']
    for (const msg of chat.mensagens) {
      const role = msg.role === 'user' ? '**Você**' : '**Copiloto IA**'
      const time = new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      lines.push(`### ${role} — ${time}`, msg.conteudo, '')
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="chat-${id.slice(0, 8)}.md"`)
    res.send(lines.join('\n'))
  }
}
