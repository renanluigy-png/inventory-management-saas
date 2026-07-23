import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const WS_URL = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function useWebSocket() {
  const { token } = useAuthStore();
  const listenersRef = useRef<Map<string, (data: unknown) => void>>(new Map());

  useEffect(() => {
    if (!token) return;

    if (!socket || !socket.connected) {
      socket = io(WS_URL, {
        path: '/ws',
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {});
      socket.on('disconnect', () => {});
      socket.on('connect_error', () => {});
    }

    return () => {
      // Don't disconnect on component unmount — keep alive globally
    };
  }, [token]);

  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    socket?.on(event, handler);
    listenersRef.current.set(event, handler);
    return () => {
      socket?.off(event, handler);
      listenersRef.current.delete(event);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socket?.emit(event, data);
  }, []);

  return { on, emit, connected: socket?.connected ?? false };
}
