import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, X, Send, Plus, Trash2, MessageSquare,
  ChevronLeft, Sparkles, Download, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../utils/cn'
import { ChatMessage, TypingIndicator } from './ChatMessage'
import {
  sendMessage, getChats, getChat, deleteChat,
  favoriteMessage, sendMessageStream, exportChat,
} from '../../api/ai'
import type { AIChat, AIMensagem } from '../../api/ai'
import { useAuthStore } from '../../store/auth.store'

const SUGGESTIONS = [
  'Quanto vendi hoje?',
  'Quais produtos estão acabando?',
  'Quem é meu melhor cliente?',
  'Mostre vendas por categoria',
  'Quais promoções estão ativas?',
  'Existe alguma inconsistência no estoque?',
  'Qual produto vendeu mais este mês?',
  'Faça um resumo geral',
]

export function ChatBot() {
  const token = useAuthStore((s) => s.token)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMensagem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const qc = useQueryClient()

  const { data: chats = [] } = useQuery<AIChat[]>({
    queryKey: ['ai-chats'],
    queryFn: getChats,
    enabled: open,
  })

  const { data: chatData } = useQuery<AIChat>({
    queryKey: ['ai-chat', activeChatId],
    queryFn: () => getChat(activeChatId!),
    enabled: !!activeChatId && view === 'chat',
  })

  useEffect(() => {
    if (chatData?.mensagens) setMessages(chatData.mensagens)
  }, [chatData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent, loading])

  const deleteMut = useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      toast.success('Conversa apagada')
      setView('list')
      setActiveChatId(null)
      setMessages([])
    },
  })

  const favMut = useMutation({
    mutationFn: favoriteMessage,
    onSuccess: (updated) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, favorita: updated.favorita } : m)),
      )
    },
  })

  function openChat(id: string) {
    setActiveChatId(id)
    setMessages([])
    setView('chat')
  }

  function newChat() {
    setActiveChatId(null)
    setMessages([])
    setView('chat')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const submit = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setStreamContent('')

    const tempUser: AIMensagem = {
      id: `tmp-${Date.now()}`,
      chatId: activeChatId ?? '',
      role: 'user',
      conteudo: text,
      favorita: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUser])

    try {
      // Try streaming first, fall back to regular
      let streamed = false
      let newChatId = activeChatId

      await sendMessageStream(
        { message: text, chatId: activeChatId ?? undefined },
        (chunk) => {
          streamed = true
          setStreamContent((prev) => prev + chunk)
        },
        (cId) => {
          newChatId = cId
          setActiveChatId(cId)
        },
      )

      if (!streamed) {
        const result = await sendMessage({ message: text, chatId: activeChatId ?? undefined })
        newChatId = result.chatId
        setActiveChatId(result.chatId)
        setMessages((prev) => [
          ...prev,
          {
            id: `tmp-ai-${Date.now()}`,
            chatId: result.chatId,
            role: 'assistant',
            conteudo: result.response,
            favorita: false,
            createdAt: new Date().toISOString(),
          },
        ])
      } else {
        // Reload full chat to get proper IDs
        const fullChat = await getChat(newChatId!)
        setMessages(fullChat.mensagens ?? [])
      }

      setStreamContent('')
      qc.invalidateQueries({ queryKey: ['ai-chats'] })
      if (newChatId) qc.invalidateQueries({ queryKey: ['ai-chat', newChatId] })
    } catch {
      toast.error('Erro ao enviar mensagem')
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id))
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeChatId, token, qc])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const hasMessages = messages.length > 0 || streamContent

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow"
        aria-label="Abrir Copiloto IA"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-40 flex flex-col w-[380px] h-[580px] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex-shrink-0">
              {view === 'chat' && (
                <button onClick={() => { setView('list'); setActiveChatId(null); setMessages([]) }} className="p-1 rounded-lg hover:bg-white/20 transition-colors" aria-label="Voltar">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {view === 'chat' && activeChatId
                      ? (chats.find((c) => c.id === activeChatId)?.titulo ?? 'Conversa')
                      : 'Copiloto IA'}
                  </p>
                  <p className="text-xs text-white/70">Assistente do ERP</p>
                </div>
              </div>
              {view === 'list' && (
                <button onClick={newChat} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors" aria-label="Nova conversa">
                  <Plus className="h-3.5 w-3.5" /> Nova
                </button>
              )}
              {view === 'chat' && activeChatId && (
                <div className="flex gap-1">
                  <button onClick={() => exportChat(activeChatId)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Exportar chat">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteMut.mutate(activeChatId)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Apagar conversa">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {view === 'list' ? (
                  <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-3 space-y-1.5">
                    {chats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                          <Bot className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Olá! Sou o Copiloto IA</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pergunte sobre vendas, estoque, clientes e muito mais.</p>
                        </div>
                        <button onClick={newChat} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                          <Plus className="h-4 w-4" /> Iniciar conversa
                        </button>
                        <div className="w-full space-y-1.5">
                          <p className="text-xs text-gray-400 font-medium">Sugestões:</p>
                          {SUGGESTIONS.slice(0, 4).map((s) => (
                            <button key={s} onClick={() => { newChat(); setTimeout(() => { setInput(s) }, 150) }} className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {chats.map((chat) => (
                          <button key={chat.id} onClick={() => openChat(chat.id)} className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors group">
                            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{chat.titulo}</p>
                              <p className="text-xs text-gray-400">{chat._count?.mensagens ?? 0} mensagens · {new Date(chat.updatedAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900">
                      {!hasMessages && !loading && (
                        <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                            <Bot className="h-7 w-7 text-indigo-500" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Faça uma pergunta sobre seu negócio</p>
                          <div className="w-full grid grid-cols-2 gap-1.5">
                            {SUGGESTIONS.slice(0, 4).map((s) => (
                              <button key={s} onClick={() => setInput(s)} className="text-left text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors leading-snug">
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} onFavorite={(id) => favMut.mutate(id)} />
                      ))}

                      {/* Streaming content */}
                      {streamContent && (
                        <ChatMessage
                          message={{ id: 'stream', chatId: '', role: 'assistant', conteudo: streamContent, favorita: false, createdAt: new Date().toISOString() }}
                        />
                      )}

                      {loading && !streamContent && <TypingIndicator />}
                      <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKey}
                          placeholder="Pergunte sobre seu negócio…"
                          rows={1}
                          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32 overflow-y-auto"
                          style={{ minHeight: '40px' }}
                        />
                        <motion.button
                          onClick={submit}
                          disabled={!input.trim() || loading}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Enviar mensagem"
                        >
                          <Send className="h-4 w-4" />
                        </motion.button>
                      </div>
                      <p className="mt-1.5 text-center text-xs text-gray-400">Enter para enviar · Shift+Enter para nova linha</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
