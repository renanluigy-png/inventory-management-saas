import api from './client';

export interface Favorito {
  id: string;
  tipo: string;
  entidadeId?: string;
  label: string;
  url?: string;
  dados?: Record<string, unknown>;
  ordem: number;
  createdAt: string;
}

export const getFavoritos = async () => {
  const { data } = await api.get('/api/v1/favoritos');
  return data.data as { items: Favorito[]; grouped: Record<string, Favorito[]> };
};

export const getFavoritosPorTipo = async (tipo: string) => {
  const { data } = await api.get(`/api/v1/favoritos/tipo/${tipo}`);
  return data.data.items as Favorito[];
};

export const toggleFavorito = async (body: { tipo: string; entidadeId?: string; label: string; url?: string }) => {
  const { data } = await api.post('/api/v1/favoritos/toggle', body);
  return data.data as { favorito: boolean; data?: Favorito };
};

export const addFavorito = async (body: Omit<Favorito, 'id' | 'ordem' | 'createdAt'>) => {
  const { data } = await api.post('/api/v1/favoritos', body);
  return data.data.favorito as Favorito;
};

export const removeFavorito = async (id: string) => {
  await api.delete(`/api/v1/favoritos/${id}`);
};

export const reordenarFavoritos = async (ordens: { id: string; ordem: number }[]) => {
  await api.put('/api/v1/favoritos/reordenar', { ordens });
};
