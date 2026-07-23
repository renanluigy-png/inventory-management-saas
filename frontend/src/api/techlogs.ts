import api from './client';

export interface TechLog {
  id: string;
  nivel: string;
  categoria: string;
  mensagem: string;
  detalhes?: Record<string, unknown>;
  usuarioId?: string;
  ip?: string;
  path?: string;
  metodo?: string;
  statusCode?: number;
  duracao?: number;
  stackTrace?: string;
  createdAt: string;
}

export interface TechLogSummary {
  countByNivel: Record<string, number>;
  slowRequests: TechLog[];
  recentErrors: TechLog[];
}

export const getTechLogs = async (params?: Record<string, string | number>) => {
  const { data } = await api.get('/api/v1/techlogs', { params });
  return data as { data: TechLog[]; meta: { total: number; page: number; limit: number; totalPages: number } };
};

export const getTechLogSummary = async () => {
  const { data } = await api.get('/api/v1/techlogs/summary');
  return data.data as TechLogSummary;
};

export const cleanupTechLogs = async (days = 30) => {
  const { data } = await api.delete('/api/v1/techlogs/cleanup', { params: { days } });
  return data.data as { deleted: number };
};
