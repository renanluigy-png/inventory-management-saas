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
  uptime: string;
  versaoNode: string;
  plataforma: string;
  cpu: { usoPct: number };
  memoria: { usadaMB: number; totalMB: number };
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
  return users as OnlineUser[];
};

export const getPlatformStats = async () => {
  const { data } = await api.get('/api/v1/monitor/platform');
  return data.data as PlatformStats;
};

export const getAPIStatus = async () => {
  const { data } = await api.get('/api/v1/monitor/status');
  return data.data as { database: string; api: string; timestamp: string };
};
