import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { notificationsApi } from '../../api/notifications'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  success: 'bg-emerald-500',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.findAll({ limit: 20 }),
    refetchInterval: 60_000, // atualiza a cada 1 minuto
  })

  const markAsRead = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteNotif = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notifications = data?.data ?? []
  const unreadCount = data?.meta.naoLidas ?? 0

  function handleNotifClick(notif: (typeof notifications)[number]) {
    if (!notif.lida) markAsRead.mutate(notif.id)
    if (notif.link) {
      setOpen(false)
      navigate(notif.link)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50 dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-900 dark:text-white">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                    !n.lida && 'bg-indigo-50/40 dark:bg-indigo-900/10'
                  )}
                  onClick={() => handleNotifClick(n)}
                >
                  <span
                    className={cn(
                      'mt-1 flex-shrink-0 w-2 h-2 rounded-full',
                      TYPE_COLORS[n.tipo] ?? 'bg-gray-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium text-gray-900 dark:text-white', !n.lida && 'font-semibold')}>
                        {n.titulo}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {n.link && <ExternalLink size={12} className="text-gray-400" />}
                        {!n.lida && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead.mutate(n.id) }}
                            className="text-gray-400 hover:text-indigo-600"
                            title="Marcar como lida"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id) }}
                          className="text-gray-400 hover:text-red-500"
                          title="Excluir"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.mensagem}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
