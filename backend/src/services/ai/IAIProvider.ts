export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  provider: string
  model?: string
  tokensUsed?: number
  durationMs?: number
}

export interface IAIProvider {
  readonly name: string
  isAvailable(): boolean
  chat(messages: AIMessage[], systemPrompt: string): Promise<AIResponse>
  stream(messages: AIMessage[], systemPrompt: string, onChunk: (text: string) => void): Promise<AIResponse>
}
