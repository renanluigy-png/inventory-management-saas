import api from './client';

export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  nome: string;
  isDefault: boolean;
  widgets: WidgetConfig[];
  updatedAt: string;
}

export const getDashboardLayout = async () => {
  const { data } = await api.get('/api/v1/dashboard-layout');
  return data.data.layout as DashboardLayout;
};

export const saveDashboardLayout = async (widgets: WidgetConfig[]) => {
  const { data } = await api.put('/api/v1/dashboard-layout', { widgets });
  return data.data.layout as DashboardLayout;
};

export const resetDashboardLayout = async () => {
  const { data } = await api.post('/api/v1/dashboard-layout/reset');
  return data.data.layout as DashboardLayout;
};

export const getDefaultWidgets = async () => {
  const { data } = await api.get('/api/v1/dashboard-layout/defaults');
  return data.data.widgets as WidgetConfig[];
};
