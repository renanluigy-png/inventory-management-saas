import Anthropic from '@anthropic-ai/sdk'
import type { IAIProvider, AIMessage, AIResponse } from './IAIProvider'
import { env } from '../../config/env'

export class AnthropicProvider implements IAIProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  isAvailable(): boolean {
    return !!env.ANTHROPIC_API_KEY
  }

  async chat(messages: AIMessage[], systemPrompt: string): Promise<AIResponse> {
    const start = Date.now()
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: env.AI_MAX_TOKENS,
      system: systemPrompt,
      messages: userMessages,
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return {
      content,
      provider: this.name,
      model: env.ANTHROPIC_MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      durationMs: Date.now() - start,
    }
  }

  async stream(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void,
  ): Promise<AIResponse> {
    const start = Date.now()
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0

    const stream = await this.client.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: env.AI_MAX_TOKENS,
      system: systemPrompt,
      messages: userMessages,
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text)
        fullContent += chunk.delta.text
      }
      if (chunk.type === 'message_delta' && chunk.usage) {
        outputTokens = chunk.usage.output_tokens
      }
      if (chunk.type === 'message_start' && chunk.message.usage) {
        inputTokens = chunk.message.usage.input_tokens
      }
    }

    return {
      content: fullContent,
      provider: this.name,
      model: env.ANTHROPIC_MODEL,
      tokensUsed: inputTokens + outputTokens,
      durationMs: Date.now() - start,
    }
  }
}
