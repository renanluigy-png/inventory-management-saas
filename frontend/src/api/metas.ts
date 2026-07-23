import api from './client';

export interface Meta {
  id: string;
  tipo: string;
  nome: string;
  descricao?: string;
  valorAlvo: number;
  periodo: string;
  inicioEm: string;
  fimEm: string;
  ativa: boolean;
  entidadeId?: string;
  entidadeTipo?: string;
  valorAtual?: number;
  porcentagem?: number;
  previsao?: number;
  ritmoEsperado?: number;
  emDia?: boolean;
  diasRestantes?: number;
}

export const getMetas = async (params?: Record<string, string>) => {
  const { data } = await api.get('/api/v1/metas', { params });
  return data.data as Meta[];
};

export const getMetasAtivas = async () => {
  const { data } = await api.get('/api/v1/metas/ativas');
  return data.data.metas as Meta[];
};

export const getMeta = async (id: string) => {
  const { data } = await api.get(`/api/v1/metas/${id}`);
  return data.data.meta as Meta;
};

export const getProgresso = async (id: string) => {
  const { data } = await api.get(`/api/v1/metas/${id}/progresso`);
  return data.data.meta as Meta;
};

export const createMeta = async (body: Omit<Meta, 'id'>) => {
  const { data } = await api.post('/api/v1/metas', body);
  return data.data.meta as Meta;
};

export const updateMeta = async (id: string, body: Partial<Meta>) => {
  const { data } = await api.put(`/api/v1/metas/${id}`, body);
  return data.data.meta as Meta;
};

export const deleteMeta = async (id: string) => {
  await api.delete(`/api/v1/metas/${id}`);
};
