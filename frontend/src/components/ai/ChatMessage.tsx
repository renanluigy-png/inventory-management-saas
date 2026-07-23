import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Star, StarOff, Bot, User, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'
import type { AIMensagem } from '../../api/ai'

interface Props {
  message: AIMensagem
  onFavorite?: (id: string) => void
}

export function ChatMessage({ message, onFavorite }: Props) {
  const isAssistant = message.role === 'assistant'
  const [copied, setCopied] = useState(false)

  async function copyContent() {
    await navigator.clipboard.writeText(message.conteudo)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3 group', isAssistant ? 'items-start' : 'items-start flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-white',
          isAssistant
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gradient-to-br from-gray-500 to-gray-700',
        )}
      >
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[85%]', !isAssistant && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isAssistant
              ? 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              : 'bg-indigo-600 text-white rounded-tr-sm',
          )}
        >
          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:text-xs prose-pre:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.conteudo}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.conteudo}</p>
          )}
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
            !isAssistant && 'flex-row-reverse',
          )}
        >
          <span className="text-xs text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={copyContent}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Copiar"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onFavorite && (
            <button
              onClick={() => onFavorite(message.id)}
              className="p-1 rounded text-gray-400 hover:text-amber-500 transition-colors"
              title={message.favorita ? 'Desfavoritar' : 'Favoritar'}
            >
              {message.favorita ? (
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <StarOff className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-indigo-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
