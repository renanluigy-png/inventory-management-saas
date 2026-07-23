import { prisma } from '../config/database';
import { appCache, CacheKeys, TTL_SECONDS } from '../utils/cache';

export interface ServerStats {
  uptime: number;
  memoryMb: { used: number; total: number; percent: number };
  cpuUsage: number;
  nodeVersion: string;
  timestamp: string;
}

export interface PlatformStats {
  usuariosOnline: number;
  vendasEmAndamento: number;
  caixasAbertos: number;
  totalEmpresas: number;
  totalUsuarios: number;
  server: ServerStats;
}

// In-memory session tracker (produção usaria Redis)
const onlineUsers = new Map<string, { nome: string; companyId?: string; lastSeen: Date }>();

export class MonitorService {
  trackUser(userId: string, nome: string, companyId?: string): void {
    onlineUsers.set(userId, { nome, companyId, lastSeen: new Date() });
    this.purgeStale();
  }

  removeUser(userId: string): void {
    onlineUsers.delete(userId);
  }

  getOnlineUsers() {
    this.purgeStale();
    return Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, ...data }));
  }

  private purgeStale(): void {
    const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 min
    for (const [id, data] of onlineUsers.entries()) {
      if (data.lastSeen < threshold) onlineUsers.delete(id);
    }
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const cached = appCache.get<PlatformStats>('MONITOR_PLATFORM_STATS');
    if (cached) return cached;

    const [vendasEmAndamento, caixasAbertos, totalEmpresas, totalUsuarios] = await Promise.all([
      prisma.sale.count({ where: { status: 'ABERTA' } }),
      prisma.caixa.count({ where: { status: 'ABERTO' } }),
      prisma.company.count({ where: { ativo: true } }),
      prisma.user.count({ where: { ativo: true } }),
    ]);

    const stats: PlatformStats = {
      usuariosOnline: onlineUsers.size,
      vendasEmAndamento,
      caixasAbertos,
      totalEmpresas,
      totalUsuarios,
      server: this.getServerStats(),
    };

    appCache.set('MONITOR_PLATFORM_STATS', stats, 15);
    return stats;
  }

  getServerStats(): ServerStats {
    const mem = process.memoryUsage();
    const totalMb = Number((process.memoryUsage.rss() / 1024 / 1024).toFixed(1));
    const usedMb = Number((mem.heapUsed / 1024 / 1024).toFixed(1));

    return {
      uptime: Math.floor(process.uptime()),
      memoryMb: {
        used: usedMb,
        total: totalMb,
        percent: totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0,
      },
      cpuUsage: 0, // real CPU requires os.cpus() differential — simplified here
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }

  async getAPIStatus() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { database: 'ok', api: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return { database: 'error', api: 'ok', timestamp: new Date().toISOString() };
    }
  }
}
