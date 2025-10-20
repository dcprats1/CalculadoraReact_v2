import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Workbook } from 'exceljs';
import { COMPARATOR_COLUMNS, COMPARATOR_ZONES, ComparatorTable } from '../CommercialComparatorPanel';

interface MiniSOPLauncherProps {
  serviceName: string;
  offerTable: ComparatorTable;
  fullSopLauncher: React.ReactNode;
}

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\- ]/gi, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

export const MiniSOPLauncher: React.FC<MiniSOPLauncherProps> = ({
  serviceName,
  offerTable,
  fullSopLauncher
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const safeServiceName = serviceName || 'Servicio';

  const fileName = useMemo(() => {
    const sanitized = sanitizeFileName(safeServiceName);
    return sanitized ? `mini-sop-${sanitized}.xlsx` : 'mini-sop.xlsx';
  }, [safeServiceName]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet(safeServiceName);

      worksheet.columns = [
        { header: 'Zona', key: 'zone', width: 18 },
        ...COMPARATOR_COLUMNS.map(column => ({ header: column, key: column, width: 14 }))
      ];

      COMPARATOR_ZONES.forEach(zone => {
        const zoneValues = offerTable[zone];
        worksheet.addRow({
          zone,
          ...COMPARATOR_COLUMNS.reduce<Record<string, number | string>>((acc, column) => {
            const value = zoneValues?.[column];
            acc[column] = Number.isFinite(value) ? Number(value.toFixed(2)) : '';
            return acc;
          }, {})
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Mini SOP export failed', error);
    } finally {
      setIsDownloading(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <style>{`
        .mini-sop-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          background-color: #047857;
          color: white;
        }
        .mini-sop-button:hover {
          background-color: #065f46;
        }
      `}</style>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="mini-sop-button"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Mini SOP
      </button>
      {fullSopLauncher}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Generar mini SOP</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Se exportará únicamente la hoja del servicio «{safeServiceName}» con los precios actuales del comparador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900">
              <p>
                El archivo contendrá únicamente los PVP sin IVA del servicio seleccionado. Revisa las demás hojas del SOP completo si necesitas enviar una oferta integral.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiniSOPLauncher;
