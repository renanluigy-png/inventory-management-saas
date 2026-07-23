import { useState } from 'react';
import { toast } from 'sonner';
import { exportData, ExportEntidade, ExportFormat } from '../api/export';

export function useExport() {
  const [exporting, setExporting] = useState(false);

  const doExport = async (entidade: ExportEntidade, format: ExportFormat = 'excel') => {
    setExporting(true);
    try {
      await exportData(entidade, format);
      toast.success(`Exportação concluída em ${format.toUpperCase()}`);
    } catch {
      toast.error('Falha ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  return { doExport, exporting };
}
