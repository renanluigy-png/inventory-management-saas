import api from './client';

export type ExportFormat = 'csv' | 'excel' | 'pdf';
export type ExportEntidade = 'products' | 'customers' | 'sales' | 'stock';

export async function exportData(entidade: ExportEntidade, format: ExportFormat = 'excel'): Promise<void> {
  const response = await api.get('/api/v1/export', {
    params: { entidade, format },
    responseType: 'blob',
  });

  const ext = format === 'excel' ? 'xlsx' : format;
  const filename = `${entidade}_${new Date().toISOString().slice(0, 10)}.${ext}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
