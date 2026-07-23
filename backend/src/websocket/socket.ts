import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types/auth.types';
import { MonitorService } from '../services/MonitorService';
import { logger } from '../utils/logger';

let io: IOServer | null = null;
const monitorSvc = new MonitorService();

export function initSocketIO(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/ws',
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('Token não fornecido.'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`WebSocket conectado: ${user.email} (${socket.id})`);

    monitorSvc.trackUser(user.sub, user.email, user.companyId);

    if (user.companyId) {
      socket.join(`company:${user.companyId}`);
    }
    if (user.role === 'MASTER' || user.role === 'ADMIN') {
      socket.join('admins');
    }

    socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));

    socket.on('disconnect', () => {
      monitorSvc.removeUser(user.sub);
      logger.info(`WebSocket desconectado: ${user.email}`);
    });
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}

export function emitToCompany(companyId: string, event: string, data: unknown): void {
  io?.to(`company:${companyId}`).emit(event, data);
}

export function emitToAdmins(event: string, data: unknown): void {
  io?.to('admins').emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  io?.emit(event, data);
}
