import api from './client';

export interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  inicio: string;
  fim?: string;
  diaTodo: boolean;
  concluido: boolean;
  cor: string;
  entidadeId?: string;
  entidadeTipo?: string;
  user?: { id: string; nome: string };
}

export const getEventos = async (params?: Record<string, string | boolean>) => {
  const { data } = await api.get('/api/v1/agenda', { params });
  return data.data.eventos as Evento[];
};

export const getEventosProximos = async () => {
  const { data } = await api.get('/api/v1/agenda/proximos');
  return data.data.eventos as Evento[];
};

export const getEventosMes = async (ano: number, mes: number) => {
  const { data } = await api.get('/api/v1/agenda/mes', { params: { ano, mes } });
  return data.data.eventos as Evento[];
};

export const createEvento = async (body: Omit<Evento, 'id' | 'user'>) => {
  const { data } = await api.post('/api/v1/agenda', body);
  return data.data.evento as Evento;
};

export const updateEvento = async (id: string, body: Partial<Evento>) => {
  const { data } = await api.put(`/api/v1/agenda/${id}`, body);
  return data.data.evento as Evento;
};

export const concluirEvento = async (id: string) => {
  const { data } = await api.patch(`/api/v1/agenda/${id}/concluir`);
  return data.data.evento as Evento;
};

export const deleteEvento = async (id: string) => {
  await api.delete(`/api/v1/agenda/${id}`);
};
