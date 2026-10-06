import api from './client';

export interface OnlineUser {
  userId: string;
  nome: string;
  companyId?: string;
  empresa?: string;
  lastSeen: string;
  pagina?: string;
}

export interface ServerStats {
  uptime: number;
  memoryMb: { used: number; total: number; percent: number };
  cpuUsage: number;
  nodeVersion: string;
  timestamp: string;
  // Campos opcionais de versões anteriores da API.
  memoria?: { usadaMB: number; totalMB: number };
  cpu?: { usoPct: number };
  versaoNode?: string;
  plataforma?: string;
  disco?: { usadoGB: number; totalGB: number };
  conexoes?: Record<string, number | string>;
  db?: { online: boolean; latenciams?: number };
  platform?: {
    vendasEmAndamento: number;
    caixasAbertos: number;
    totalEmpresas: number;
    totalUsuarios: number;
  };
}

export interface PlatformStats {
  usuariosOnline: number;
  vendasEmAndamento: number;
  caixasAbertos: number;
  totalEmpresas: number;
  totalUsuarios: number;
}

export const getServerStats = async () => {
  const { data } = await api.get('/api/v1/monitor/server');
  return data.data as ServerStats;
};

export const getOnlineUsers = async () => {
  const { data } = await api.get('/api/v1/monitor/online-users');
  const users = data.data?.users ?? data.data ?? [];
  return (users as Array<OnlineUser & { id?: string }>).map((user) => ({
    ...user,
    userId: user.userId ?? user.id ?? '',
  }));
};

export const getPlatformStats = async () => {
  const { data } = await api.get('/api/v1/monitor/platform');
  return data.data as PlatformStats;
};

export const getAPIStatus = async () => {
  const { data } = await api.get('/api/v1/monitor/status');
  return data.data as { database: string; api: string; timestamp: string };
};
